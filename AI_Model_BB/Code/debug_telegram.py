"""
Debug script to troubleshoot Telegram bot token issues
"""
import os
import requests
from dotenv import load_dotenv

def debug_telegram_setup():
    """Debug the Telegram bot configuration step by step."""
    print("TELEGRAM SETUP DEBUG")
    print("=" * 40)
    
    # Load environment variables
    load_dotenv()
    
    # Get the raw values
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    print("1. Environment Variables:")
    print(f"   Bot Token: {repr(bot_token)}")  # repr shows any hidden characters
    print(f"   Chat ID: {repr(chat_id)}")
    print()
    
    if not bot_token:
        print("ERROR: TELEGRAM_BOT_TOKEN not found in environment")
        print("Make sure your .env file contains:")
        print("TELEGRAM_BOT_TOKEN=your_actual_token")
        return
    
    if not chat_id:
        print("ERROR: TELEGRAM_CHAT_ID not found in environment")
        print("Make sure your .env file contains:")
        print("TELEGRAM_CHAT_ID=your_actual_chat_id")
        return
    
    # Clean the token (remove any whitespace)
    bot_token = bot_token.strip()
    chat_id = chat_id.strip()
    
    print("2. Cleaned Values:")
    print(f"   Bot Token Length: {len(bot_token)}")
    print(f"   Chat ID: {chat_id}")
    print()
    
    # Construct the URL
    base_url = f"https://api.telegram.org/bot{bot_token}"
    getme_url = f"{base_url}/getMe"
    sendmessage_url = f"{base_url}/sendMessage"
    
    print("3. Generated URLs:")
    print(f"   Base URL: {base_url}")
    print(f"   GetMe URL: {getme_url}")
    print()
    
    # Test the bot token with getMe
    print("4. Testing Bot Token with /getMe:")
    try:
        response = requests.get(getme_url, timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                print(f"   SUCCESS: Bot found - {bot_info.get('first_name', 'Unknown')} (@{bot_info.get('username', 'Unknown')})")
            else:
                print(f"   ERROR: API returned ok=false: {data}")
                return
        else:
            print(f"   ERROR: HTTP {response.status_code}")
            if response.status_code == 404:
                print("   This usually means the bot token is invalid")
            return
    except Exception as e:
        print(f"   ERROR: Request failed - {e}")
        return
    
    print()
    
    # Test sending a message
    print("5. Testing Message Send:")
    test_payload = {
        'chat_id': chat_id,
        'text': 'Test message from debug script'
    }
    
    try:
        response = requests.post(sendmessage_url, json=test_payload, timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print("   SUCCESS: Test message sent!")
                print("   Check your Telegram chat for the message.")
            else:
                print(f"   ERROR: Send failed - {data}")
        else:
            print(f"   ERROR: HTTP {response.status_code}")
            if response.status_code == 400:
                print("   This usually means the chat_id is invalid")
            elif response.status_code == 403:
                print("   This means the bot can't send messages to this chat")
                print("   Make sure you've started a conversation with the bot first")
    except Exception as e:
        print(f"   ERROR: Request failed - {e}")

def check_env_file():
    """Check the .env file contents."""
    print("CHECKING .env FILE")
    print("=" * 40)
    
    if os.path.exists('.env'):
        print("Found .env file. Contents:")
        with open('.env', 'r') as f:
            for i, line in enumerate(f, 1):
                # Don't print sensitive tokens completely, just show format
                if 'TELEGRAM_BOT_TOKEN' in line:
                    if '=' in line:
                        key, value = line.split('=', 1)
                        value = value.strip()
                        if value and len(value) > 10:
                            masked = value[:8] + "..." + value[-8:]
                            print(f"   Line {i}: {key}={masked}")
                        else:
                            print(f"   Line {i}: {line.strip()} (VALUE LOOKS SHORT/EMPTY)")
                    else:
                        print(f"   Line {i}: {line.strip()} (NO = SIGN FOUND)")
                elif 'TELEGRAM_CHAT_ID' in line:
                    print(f"   Line {i}: {line.strip()}")
                elif line.strip() and not line.strip().startswith('#'):
                    print(f"   Line {i}: {line.strip()}")
        print()
    else:
        print("No .env file found!")
        print("You need to create a .env file with:")
        print("TELEGRAM_BOT_TOKEN=your_bot_token")
        print("TELEGRAM_CHAT_ID=your_chat_id")
        return False
    
    return True

if __name__ == "__main__":
    # First check the .env file
    if check_env_file():
        print()
        # Then test the Telegram setup
        debug_telegram_setup()