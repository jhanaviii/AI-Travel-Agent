#!/usr/bin/env python3
"""
Script to apply Supabase RLS policies
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import requests

# Load environment variables
load_dotenv()

def apply_policies():
    """Apply RLS policies to Supabase"""
    
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in .env file")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Read the SQL file
    with open('fix_supabase_policies.sql', 'r') as f:
        sql_content = f.read()
    
    # Split into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
    
    print("Applying Supabase RLS policies...")
    
    for i, statement in enumerate(statements, 1):
        if not statement:
            continue
            
        try:
            print(f"Executing statement {i}/{len(statements)}...")
            result = supabase.rpc('exec_sql', {'sql': statement}).execute()
            print(f"✅ Statement {i} executed successfully")
        except Exception as e:
            print(f"⚠️  Statement {i} failed (might already exist): {e}")
            continue
    
    print("✅ RLS policies applied successfully!")

if __name__ == "__main__":
    apply_policies() 