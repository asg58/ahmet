                    # Voer code uit in aparte thread
                    result = None
                    
                    def execute_code_thread():
                        nonlocal result
                        result = execute_python_in_blender(code)
                    
                    thread = threading.Thread(target=execute_code_thread)
                    thread.start()
                    thread.join(timeout=60)  # Wacht maximaal 60 seconden 