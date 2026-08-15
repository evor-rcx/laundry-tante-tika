import re

with open('android/app/build.gradle', 'r') as f:
    content = f.read()

new_signing = """
    signingConfigs {
        def keystoreFile = file("keystore.p12")
        def b64File = file("keystore.b64")
        if (!keystoreFile.exists() && b64File.exists()) {
            keystoreFile.bytes = b64File.text.decodeBase64()
        }

        release {
            storeFile keystoreFile
            storePassword "ttlaundry123"
            keyAlias "ttlaundry"
            keyPassword "ttlaundry123"
        }
        debug {
            storeFile keystoreFile
            storePassword "ttlaundry123"
            keyAlias "ttlaundry"
            keyPassword "ttlaundry123"
        }
    }
"""

content = re.sub(r'signingConfigs\s*\{[\s\S]*?\}\s*\}', new_signing.strip() + '\n', content)

with open('android/app/build.gradle', 'w') as f:
    f.write(content)
