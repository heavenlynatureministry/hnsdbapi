# Quick fix to update config for comma-separated ALLOWED_ORIGINS
import re

with open('app/core/config.py', 'r') as f:
    content = f.read()

# Add validator for ALLOWED_ORIGINS
validator_code = '''
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list"""
        if isinstance(v, str):
            if v.startswith('['):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
'''

# Insert validator after CORS section
insert_pos = content.find('    # =========================================================================\n    # FILE UPLOAD SETTINGS')
if insert_pos > 0:
    content = content[:insert_pos] + validator_code + '\n' + content[insert_pos:]
    with open('app/core/config.py', 'w') as f:
        f.write(content)
    print("✅ Config patched to accept comma-separated origins")
else:
    print("❌ Could not find insertion point")
