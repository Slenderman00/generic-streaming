#!/bin/sh
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\q"; do
  echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

envsubst < ./prisma/schema.prisma > ./prisma/schema.prisma.tmp
mv ./prisma/schema.prisma.tmp ./prisma/schema.prisma

npx prisma generate

npx prisma db push --accept-data-loss

node ./src/main.js