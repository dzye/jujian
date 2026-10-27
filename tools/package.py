"""Create a Chrome Web Store ZIP with manifest.json at its root."""
from pathlib import Path
import json
import zipfile
root = Path(__file__).resolve().parents[1]
source = root / 'extension'
manifest = json.loads((source / 'manifest.json').read_text())
assert len(manifest['description']) <= 132
assert manifest['manifest_version'] == 3
output = root / 'dist' / ('jujian-webstore-' + manifest['version'] + '.zip')
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_file() and file.name != '.DS_Store':
            archive.write(file, file.relative_to(source).as_posix())
with zipfile.ZipFile(output) as archive:
    assert 'manifest.json' in archive.namelist()
    assert not any(name.startswith('extension/') for name in archive.namelist())
print(output)
