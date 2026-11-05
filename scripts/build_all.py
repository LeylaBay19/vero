from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
for script in ['build.py']:
    subprocess.run([sys.executable,str(root/'scripts'/script)],cwd=root,check=True)

subprocess.run([sys.executable,str(root/"scripts/export_delivery.py")],cwd=root,check=True)

subprocess.run([sys.executable,str(root/"scripts/build_platform_entry.py")],cwd=root,check=True)
subprocess.run([sys.executable,str(root/"scripts/build_cabinets.py")],cwd=root,check=True)
subprocess.run([sys.executable,str(root/"scripts/build_stand.py")],cwd=root,check=True)
