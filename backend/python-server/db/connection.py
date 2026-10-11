
import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the python-server root
SERVER_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(SERVER_ROOT / ".env")


def get_db_connection():
    """Create and return a PostgreSQL database connection."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is missing. Set it in your .env file."
        )

    try:
        connection = psycopg2.connect(database_url)
        return connection
    except psycopg2.Error as error:
        raise RuntimeError(
            f"Failed to connect to PostgreSQL: {error}"
        ) from error


if __name__ == "__main__":
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                print("Connected to PostgreSQL successfully!")
                print(cursor.fetchone()[0])
    except Exception as error:
        print(f"Database connection failed: {error}")