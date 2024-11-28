import os
import subprocess
import tempfile
from collections import defaultdict
import yaml
import logging
import string
from dotenv import load_dotenv


# ANSI color codes
class Colors:
    RED = "\033[91m"
    RESET = "\033[0m"


class ColoredFormatter(logging.Formatter):
    """Custom formatter to add colors to error and warning messages"""

    def format(self, record):
        if record.levelno >= logging.ERROR:
            record.msg = f"{Colors.RED}{record.msg}{Colors.RESET}"
        return super().format(record)


def setup_logging():
    """Setup logging with colored output for errors"""
    formatter = ColoredFormatter("%(asctime)s - %(levelname)s - %(message)s")
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.handlers = []  # Remove any existing handlers
    logger.addHandler(handler)


def load_environment():
    """Load environment variables from .env file"""
    if os.path.exists(".env"):
        load_dotenv()
    else:
        logging.warning("No .env file found")


def get_kind_priority():
    """
    Define the priority order for Kubernetes resource kinds.
    Lower number means higher priority.
    """
    return {
        "Namespace": 0,
        "CustomResourceDefinition": 1,
        "StorageClass": 2,
        "PersistentVolume": 3,
        "ClusterRole": 4,
        "ClusterRoleBinding": 5,
        "ServiceAccount": 6,
        "Role": 7,
        "RoleBinding": 8,
        "ConfigMap": 9,
        "Secret": 10,
        "PersistentVolumeClaim": 11,
        "Service": 12,
        "Deployment": 13,
        "StatefulSet": 14,
        "DaemonSet": 15,
        "Job": 16,
        "CronJob": 17,
        "Pod": 18,
        "Ingress": 19,
        "HorizontalPodAutoscaler": 20,
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
        logging.error(f"Missing required environment variable: {e}")
        # Fall back to safe_substitute which leaves unknown variables unchanged
        return template.safe_substitute(os.environ)


def process_yaml_file(file_path, temp_dir):
    """
    Process a YAML file by substituting environment variables and saving to temp directory.
    Returns the path to the processed file and its highest priority level.
    """
    kind_priority = get_kind_priority()
    highest_priority = float("inf")

    try:
        with open(file_path, "r") as f:
            content = f.read()

        # Substitute environment variables
        processed_content = substitute_env_vars(content)

        # Parse YAML to determine priority
        try:
            documents = list(yaml.safe_load_all(processed_content))
            if not documents or not any(documents):
                logging.error(f"No valid YAML documents found in {file_path}")
                return None, float("inf")

            for doc in documents:
                if doc and "kind" in doc:
                    priority = kind_priority.get(doc["kind"], 100)
                    highest_priority = min(highest_priority, priority)
                else:
                    logging.error(f"Invalid or empty YAML document in {file_path}")

        except yaml.YAMLError as e:
            logging.error(f"YAML parsing error in {file_path}: {str(e)}")
            return None, float("inf")

        # Create processed file in temp directory maintaining directory structure
        rel_path = os.path.relpath(file_path, start="./configs")
        processed_file_path = os.path.join(temp_dir, rel_path)
        os.makedirs(os.path.dirname(processed_file_path), exist_ok=True)

        with open(processed_file_path, "w") as f:
            f.write(processed_content)

        return processed_file_path, highest_priority

    except Exception as e:
        logging.error(f"Error processing file {file_path}: {str(e)}")
        return None, float("inf")


def load_yaml_files(directory, temp_dir):
    """
    Load and process all Kubernetes YAML files in the given directory and subdirectories.
    Returns a dictionary with priority levels as keys and lists of processed file paths as values.
    """
    priority_files = defaultdict(list)

    if not os.path.exists(directory):
        logging.error(f"Directory not found: {directory}")
        return priority_files

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith((".yaml", ".yml")):
                file_path = os.path.join(root, file)
                processed_path, priority = process_yaml_file(file_path, temp_dir)
                if processed_path:
                    priority_files[priority].append(processed_path)
                    logging.info(f"Processed {file_path} -> {processed_path}")

    if not priority_files:
        logging.error(f"No valid YAML files found in {directory}")

    return priority_files


def apply_kubernetes_configs(directory, kubectl_path="kubectl"):
    """
    Apply Kubernetes configurations in the correct order with environment variable substitution.
    """
    setup_logging()
    load_environment()
    logging.info(
        "Starting ordered Kubernetes config application with environment substitution"
    )

    # Verify kubectl exists
    try:
        subprocess.run(
            [kubectl_path, "version", "--client"], capture_output=True, check=True
        )
    except subprocess.CalledProcessError:
        logging.error(f"kubectl not found at {kubectl_path}")
        return
    except FileNotFoundError:
        logging.error(f"kubectl not found at {kubectl_path}")
        return

    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        logging.info(f"Created temporary directory: {temp_dir}")

        # Process and load files
        priority_files = load_yaml_files(directory, temp_dir)

        # Apply files in priority order
        error_count = 0
        for priority in sorted(priority_files.keys()):
            for file_path in priority_files[priority]:
                logging.info(f"Applying {file_path}")
                try:
                    result = subprocess.run(
                        [kubectl_path, "apply", "-f", file_path],
                        capture_output=True,
                        text=True,
                    )
                    if result.returncode == 0:
                        logging.info(f"Successfully applied {file_path}")
                        logging.debug(result.stdout)
                    else:
                        error_count += 1
                        logging.error(f"Failed to apply {file_path}")
                        logging.error(f"Error details: {result.stderr}")
                except subprocess.SubprocessError as e:
                    error_count += 1
                    logging.error(f"Error executing kubectl for {file_path}: {str(e)}")

        if error_count > 0:
            logging.error(f"Completed with {error_count} errors")
        else:
            logging.info("All configurations applied successfully")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Apply Kubernetes configs in the correct order"
    )
    parser.add_argument("directory", help="Directory containing Kubernetes YAML files")
    parser.add_argument(
        "--kubectl-path", default="kubectl", help="Path to kubectl binary"
    )
    args = parser.parse_args()

    apply_kubernetes_configs(args.directory, args.kubectl_path)
