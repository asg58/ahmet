                    # Voer code uit in aparte thread
                    result = None
                    
                    def execute_code_thread():
                        nonlocal result
                        result = execute_python_in_blender(code)
                    
                    thread = threading.Thread(target=execute_code_thread)
                    thread.start()
                    thread.join(timeout=60)  # Wacht maximaal 60 seconden 

@app.route('/api/execute', methods=['POST'])
def execute_code():
    """API endpoint voor het uitvoeren van Python code in Blender"""
    try:
        data = request.json
        code = data.get('code')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "Geen code opgegeven"
            })
        
        result = execute_python_in_blender(code)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Fout bij execute_code endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }) 