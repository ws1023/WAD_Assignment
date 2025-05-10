#!/usr/bin/env python3
"""
Database initialization script for music app
This script creates the SQLite database and schema needed for the React Native music app.
Once created, the database file should be copied to the app's assets folder.
"""

import sqlite3
import os
import shutil
import time

def create_database():
    """Create a new SQLite database with the required schema"""
    
    # Delete the database file if it already exists
    if os.path.exists('db.sqlite'):
        os.remove('db.sqlite')
    
    # Connect to the database (this will create it if it doesn't exist)
    conn = sqlite3.connect('db.sqlite')
    cursor = conn.cursor()
    
    print("Creating database schema...")
    
    # Create songs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      albumArt TEXT,
      uri TEXT,
      duration INTEGER
    );
    ''')
    
    # Create playlists table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    ''')
    
    # Create playlist_songs table (junction table)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS playlist_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlistId INTEGER NOT NULL,
      songId TEXT NOT NULL,
      addedAt INTEGER NOT NULL,
      FOREIGN KEY (playlistId) REFERENCES playlists (id) ON DELETE CASCADE,
      FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
      UNIQUE (playlistId, songId)
    );
    ''')
    
    # Create liked_songs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS liked_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      songId TEXT NOT NULL,
      addedAt INTEGER NOT NULL,
      FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
      UNIQUE (songId)
    );
    ''')
    
    # Insert some sample data
    insert_sample_data(cursor)
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    
    print(f"Database created successfully: {os.path.abspath('db.sqlite')}")
    
    return os.path.abspath('db.sqlite')

def insert_sample_data(cursor):
    """Insert sample data into the database"""
    print("Inserting sample data...")
    
    # Current timestamp in seconds
    now = int(time.time())
    
    # Sample songs
    songs = [
        ("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 
         "https://example.com/queen_bohemian.jpg", "spotify:track:6l8GvAyoUZwWDgF1e4822w", 354000),
        ("2", "Billie Jean", "Michael Jackson", "Thriller", 
         "https://example.com/mj_thriller.jpg", "spotify:track:5ChkMS8OtdzJeqyybCc9R5", 294000),
        ("3", "Hotel California", "Eagles", "Hotel California", 
         "https://example.com/eagles_hotel.jpg", "spotify:track:40riOy7x9W7GXjyGp4pjAv", 391000),
        ("4", "Sweet Child O' Mine", "Guns N' Roses", "Appetite for Destruction", 
         "https://example.com/gnr_appetite.jpg", "spotify:track:7o2CTH4ctstm8TNelqjb51", 356000),
        ("5", "Imagine", "John Lennon", "Imagine", 
         "https://example.com/lennon_imagine.jpg", "spotify:track:7pKfPomDEeI4TPT6EOYjn9", 183000),
    ]
    
    cursor.executemany(
        "INSERT INTO songs (id, name, artist, album, albumArt, uri, duration) VALUES (?, ?, ?, ?, ?, ?, ?)",
        songs
    )
    
    # Sample playlists
    playlists = [
        ("My Favorites", now - 86400),  # 1 day ago
        ("Rock Classics", now - 43200),  # 12 hours ago
        ("Chill Vibes", now)
    ]
    
    cursor.executemany(
        "INSERT INTO playlists (name, createdAt) VALUES (?, ?)",
        playlists
    )
    
    # Get the inserted playlist IDs
    cursor.execute("SELECT id FROM playlists")
    playlist_ids = [row[0] for row in cursor.fetchall()]
    
    # Add songs to playlists
    playlist_songs = [
        (playlist_ids[0], "1", now - 3600),  # My Favorites
        (playlist_ids[0], "3", now - 3000),  # My Favorites
        (playlist_ids[0], "5", now - 2400),  # My Favorites
        (playlist_ids[1], "1", now - 1800),  # Rock Classics
        (playlist_ids[1], "3", now - 1200),  # Rock Classics
        (playlist_ids[1], "4", now - 600),   # Rock Classics
        (playlist_ids[2], "2", now - 300),   # Chill Vibes
        (playlist_ids[2], "5", now)          # Chill Vibes
    ]
    
    cursor.executemany(
        "INSERT INTO playlist_songs (playlistId, songId, addedAt) VALUES (?, ?, ?)",
        playlist_songs
    )
    
    # Add some liked songs
    liked_songs = [
        ("1", now - 7200),  # Bohemian Rhapsody
        ("2", now - 5400),  # Billie Jean
        ("5", now - 1800)   # Imagine
    ]
    
    cursor.executemany(
        "INSERT INTO liked_songs (songId, addedAt) VALUES (?, ?)",
        liked_songs
    )
    
    print("Sample data inserted successfully")

def copy_to_assets(db_path, assets_folder):
    """Copy the database file to the app's assets folder"""
    if not os.path.exists(assets_folder):
        os.makedirs(assets_folder)
        
    dest_path = os.path.join(assets_folder, 'db.sqlite')
    shutil.copy2(db_path, dest_path)
    print(f"Database copied to assets folder: {dest_path}")
    
    return dest_path

def main():
    """Main function"""
    print("Creating music app database...")
    
    # Create the database
    db_path = create_database()
    
    # Define assets folder path - you may need to adjust this path for your project structure
    # For Android:
    android_assets = os.path.join('android', 'app', 'src', 'main', 'assets')
    # For iOS (you'll need to handle this separately with a different approach):
    ios_assets = os.path.join('ios', 'Assets')
    
    # Try to copy to Android assets
    try:
        copy_to_assets(db_path, android_assets)
        print("\nTo use this database in your React Native app:")
        print("1. Make sure the database is copied to the correct location in your project")
        print("2. For Android: It's now in your assets folder")
        print("3. For iOS: You'll need to add the database file to your Xcode project")
        print("\nModify your React Native SQLite code to use the pre-populated database from assets.")
    except Exception as e:
        print(f"Warning: Could not copy database to assets folder: {e}")
        print("You'll need to manually copy the database file to your project's assets folder.")
    
    print("\nDatabase creation complete!")

if __name__ == "__main__":
    main()