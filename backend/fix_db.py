import mysql.connector

def fix_db():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="sign_language_app"
    )
    cursor = conn.cursor()
    try:
        cursor.execute("DROP TABLE IF EXISTS users")
        cursor.execute('''
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        print("Successfully recreated users table with username and email.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_db()
