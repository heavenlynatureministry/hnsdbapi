# Fix the config.py file - replace field_validator with validator
import re

with open('app/core/config.py', 'r') as f:
    content = f.read()

# Fix 1: Remove the broken field_validator and add proper import
# Replace the broken validator with a working one
old_validator = '''    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list"""
        if isinstance(v, str):
            if v.startswith('['):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v'''

new_validator = '''    @validator('ALLOWED_ORIGINS', pre=True)
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list"""
        if isinstance(v, str):
            if v.startswith('['):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v'''

content = content.replace(old_validator, new_validator)

# Fix 2: Ensure 'validator' is imported from pydantic
# Check if validator is already imported
if 'from pydantic import' in content and 'validator' not in content.split('from pydantic import')[1].split('\n')[0]:
    content = content.replace(
        'from pydantic import Field, EmailStr, validator, AnyHttpUrl',
        'from pydantic import Field, EmailStr, validator, AnyHttpUrl'
    )
    # If validator is not in the import, add it
    if 'from pydantic import' in content:
        content = content.replace(
            'from pydantic import Field, EmailStr, AnyHttpUrl',
            'from pydantic import Field, EmailStr, validator, AnyHttpUrl'
        )

with open('app/core/config.py', 'w') as f:
    f.write(content)

print("✅ Config fixed successfully!")
