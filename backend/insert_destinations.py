#!/usr/bin/env python3
"""
Script to insert sample destinations into Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import uuid

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Sample destinations data
destinations = [
    {
        "id": str(uuid.uuid4()),
        "name": "Santorini, Greece",
        "country": "Greece",
        "city": "Santorini",
        "continent": "Europe",
        "description": "Famous for its stunning sunsets, white-washed buildings, and crystal-clear waters. Perfect for romantic getaways and photography enthusiasts.",
        "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=600&fit=crop"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Kyoto, Japan",
        "country": "Japan",
        "city": "Kyoto",
        "continent": "Asia",
        "description": "Ancient capital with traditional temples, beautiful gardens, and cherry blossoms. A perfect blend of history and natural beauty.",
        "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Banff National Park",
        "country": "Canada",
        "city": "Banff",
        "continent": "North America",
        "description": "Stunning mountain landscapes, turquoise lakes, and abundant wildlife. A paradise for nature lovers and outdoor enthusiasts.",
        "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Machu Picchu",
        "country": "Peru",
        "city": "Cusco",
        "continent": "South America",
        "description": "Ancient Incan citadel set high in the Andes Mountains. One of the most impressive archaeological sites in the world.",
        "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&h=600&fit=crop"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Safari in Serengeti",
        "country": "Tanzania",
        "city": "Serengeti",
        "continent": "Africa",
        "description": "Experience the wild beauty of Africa with incredible wildlife viewing, including the Great Migration.",
        "image_url": "https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&h=600&fit=crop"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Sydney Opera House",
        "country": "Australia",
        "city": "Sydney",
        "continent": "Oceania",
        "description": "Iconic performing arts center with stunning harbor views. A masterpiece of modern architecture.",
        "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop"
    }
]

def insert_destinations():
    """Insert sample destinations into the database"""
    try:
        # Insert new destinations one by one
        print("Inserting sample destinations...")
        for destination in destinations:
            try:
                result = supabase.table("destinations").insert(destination).execute()
                print(f"✓ Inserted: {destination['name']}")
            except Exception as e:
                print(f"⚠️  Failed to insert {destination['name']}: {e}")
                # Try without ID (let database generate it)
                try:
                    dest_without_id = {k: v for k, v in destination.items() if k != 'id'}
                    result = supabase.table("destinations").insert(dest_without_id).execute()
                    print(f"✓ Inserted (without ID): {destination['name']}")
                except Exception as e2:
                    print(f"❌ Failed to insert {destination['name']} even without ID: {e2}")
        
        # Verify the insertions
        result = supabase.table("destinations").select("*").execute()
        print(f"\nTotal destinations in database: {len(result.data)}")
        
        if len(result.data) > 0:
            print("✅ Successfully inserted destinations!")
        else:
            print("❌ No destinations were inserted. Check RLS policies.")
        
    except Exception as e:
        print(f"❌ Error inserting destinations: {e}")

if __name__ == "__main__":
    insert_destinations() 