import os
import subprocess
import tempfile
import shutil
from collections import defaultdict
import yaml
import logging
import string

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

def get_kind_priority():
    """
    Define the priority order for Kubernetes resource kinds.
    Lower number means higher priority.
    """
    return {
        'Namespace': 0,
        'CustomResourceDefinition': 1,
        'StorageClass': 2,
        'PersistentVolume': 3,
        'ClusterRole': 4,
        'ClusterRoleBinding': 5,
        'ServiceAccount': 6,
        'Role': 7,
        'RoleBinding': 8,
        'ConfigMap': 9,
        'Secret': 10,
        'PersistentVolumeClaim': 11,
        'Service': 12,
        'Deployment': 13,
        'StatefulSet': 14,
        'DaemonSet': 15,
        'Job': 16,
        'CronJob': 17,
        'Pod': 18,
        'Ingress': 19,
        'HorizontalPodAutoscaler': 20
    }

def substitute_env_vars(content):
    """
    Substitute environment variables in the content, similar to envsubst.
    Handles both $VAR and ${VAR} syntax.
    """
    template = string.Template(content)
    try:
        return template.substitute(os.environ)
    except KeyError as e:
        logging.warning(f"Environment variable {e} not found")
        # Fall back to safe_substitute which leaves unknown variables unchanged
        return template.safe_substitute(os.environ)

def process_yaml_file(file_path, temp_dir):
    """
    Process a YAML file by substituting environment variables and saving to temp directory.
    Returns the path to the processed file and its highest priority level.
    """
    kind_priority = get_kind_priority()
    highest_priority = float('inf')
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Substitute environment variables
        processed_content = substitute_env_vars(content)
        
        # Parse YAML to determine priority
        documents = yaml.safe_load_all(processed_content)
        for doc in documents:
            if doc and 'kind' in doc:
                priority = kind_priority.get(doc['kind'], 100)
                highest_priority = min(highest_priority, priority)
        
        # Create processed file in temp directory maintaining directory structure
        rel_path = os.path.relpath(file_path, start='./configs')
        processed_file_path = os.path.join(temp_dir, rel_path)
        os.makedirs(os.path.dirname(processed_file_path), exist_ok=True)
        
        with open(processed_file_path, 'w') as f:
            f.write(processed_content)
            
        return processed_file_path, highest_priority
        
    except Exception as e:
        logging.error(f"Error processing file {file_path}: {str(e)}")
        return None, float('inf')

def load_yaml_files(directory, temp_dir):
    """
    Load and process all Kubernetes YAML files in the given directory and subdirectories.
    Returns a dictionary with priority levels as keys and lists of processed file paths as values.
    """
    priority_files = defaultdict(list)
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.yaml', '.yml')):
                file_path = os.path.join(root, file)
                processed_path, priority = process_yaml_file(file_path, temp_dir)
                if processed_path:
                    priority_files[priority].append(processed_path)
                    logging.info(f"Processed {file_path} -> {processed_path}")
    
    return priority_files

def apply_kubernetes_configs(directory, kubectl_path='kubectl'):
    """
    Apply Kubernetes configurations in the correct order with environment variable substitution.
    """
    setup_logging()
    logging.info("Starting ordered Kubernetes config application with environment substitution")
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        logging.info(f"Created temporary directory: {temp_dir}")
        
        # Process and load files
        priority_files = load_yaml_files(directory, temp_dir)
        
        # Apply files in priority order
        for priority in sorted(priority_files.keys()):
            for file_path in priority_files[priority]:
                logging.info(f"Applying {file_path}")
                try:
                    # Display processed content
                    with open(file_path, 'r') as f:
                        logging.info(f"Processed content for {file_path}:")
                        logging.info(f.read())
                    
                    result = subprocess.run(
                        [kubectl_path, 'apply', '-f', file_path],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        logging.info(f"Successfully applied {file_path}")
                        logging.debug(result.stdout)
                    else:
                        logging.error(f"Failed to apply {file_path}")
                        logging.error(result.stderr)
                except subprocess.SubprocessError as e:
                    logging.error(f"Error executing kubectl for {file_path}: {str(e)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Apply Kubernetes configs in the correct order')
    parser.add_argument('directory', help='Directory containing Kubernetes YAML files')
    parser.add_argument('--kubectl-path', default='kubectl', help='Path to kubectl binary')
    args = parser.parse_args()
    
    apply_kubernetes_configs(args.directory, args.kubectl_path)