from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
for script in ['build.py','diagrams.py','export_schemes.py']:
    subprocess.run([sys.executable,str(root/'scripts'/script)],cwd=root,check=True)

subprocess.run([sys.executable,str(root/"scripts/export_schemes.py"),"--v2"],cwd=root,check=True)
subprocess.run([sys.executable,str(root/"scripts/validate_bpmn.py")],cwd=root,check=True)
subprocess.run([sys.executable,str(root/"scripts/export_delivery.py")],cwd=root,check=True)
