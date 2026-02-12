
import pty
import os
import time
import sys
import select

def deploy():
    # Fork a child process with a PTY
    pid, fd = pty.fork()
    if pid == 0:
        # Child process: Execute the leo command
        # Unbuffered Python output
        sys.stdout.flush()
        # Removed priority fee to use default
        os.execvp("leo", [
            "leo", "deploy", 
            "--network", "testnet", 
            "--endpoint", "https://api.explorer.provable.com/v1", 
            "--private-key", "APrivateKey1zkp7Ut7qtZRmMjPWij2puVMuewB86gS8mwVjK8EpxoebVeN", 
            "--broadcast"
        ])
    else:
        # Parent process
        print("Starting interactive deployment (spam mode v2)...")
        last_y = time.time()
        
        while True:
            # Check if child process has exited
            wpid, status = os.waitpid(pid, os.WNOHANG)
            if wpid != 0:
                print(f"\nProcess exited with status {status}")
                break
                
            # Read output
            r, w, e = select.select([fd], [], [], 0.1)
            if fd in r:
                try:
                    data = os.read(fd, 1024)
                    if not data:
                        break # EOF
                    
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
                except OSError:
                    break
            
            # Send 'y' every 2 seconds
            if time.time() - last_y > 2.0:
                 try:
                     # print("\n[Script] Sending periodic 'y'...")
                     os.write(fd, b"y\n")
                     last_y = time.time()
                 except OSError:
                     break
            
            time.sleep(0.01)

if __name__ == "__main__":
    deploy()
