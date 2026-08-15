import re

with open('android/app/build.gradle', 'r') as f:
    content = f.read()

signing_config = """
    signingConfigs {
        release {
            storeFile file("keystore.p12")
            storePassword "ttlaundry123"
            keyAlias "ttlaundry"
            keyPassword "ttlaundry123"
        }
        debug {
            storeFile file("keystore.p12")
            storePassword "ttlaundry123"
            keyAlias "ttlaundry"
            keyPassword "ttlaundry123"
        }
    }
"""

# Insert signing config before buildTypes
content = re.sub(r'(\s+)(buildTypes\s*\{)', r'\1' + signing_config.strip().replace('\n', '\n    ') + r'\1\2', content)

# Modify release to use signingConfig
content = re.sub(r'(release\s*\{)', r'\1\n            signingConfig signingConfigs.release', content)

# Modify debug to use signingConfig (if debug block exists, else add it)
if 'debug {' in content:
    content = re.sub(r'(debug\s*\{)', r'\1\n            signingConfig signingConfigs.debug', content)
else:
    content = re.sub(r'(buildTypes\s*\{)', r'\1\n        debug {\n            signingConfig signingConfigs.debug\n        }', content)


with open('android/app/build.gradle', 'w') as f:
    f.write(content)

