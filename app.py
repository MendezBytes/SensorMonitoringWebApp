import logging
import datetime
import threading
import time
from models import store_measurement,get_latest_measurments
from mpl3115a2 import *
from flask import Flask, render_template,jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'bCNyiKlA2252Qx3-VspMkA'


log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


socketio = SocketIO(app,cors_allowed_origins="*")


def background_task():
    while True:
        temp = get_temperature()
        altitude = get_altitude()
        store_measurement(temp,altitude)
        print(f"Stored temp value of {temp} and alt value of {altitude}")
        time.sleep(5)


def print_time():
    current_time = datetime.datetime.now().time()
    formatted_time = current_time.strftime("%H:%M:%S")
    print("Current Time:", formatted_time)

@app.route('/')
def index():
    return render_template('index.html')
    
@app.route('/getMeasurments')
def getMeasurments():

    readings = get_latest_measurments()
    sensor_data = []
    for reading in readings:
        sensor_data.append({
        "id": reading.id,
        "temp": reading.temperature,
        "alt": reading.altitude,
        "timestamp": reading.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        })
        
    sensor_data = {
        "sensor_data":sensor_data
    }
    return jsonify(sensor_data)

@socketio.on('connect')
def handle_connect():
    print_time()
    print('Client connected')

@socketio.on('message')
def handle_message(data):
    print('Received message:', data)
    print('Temperature is: ',get_temperature())
    emit('response', 'Message received: ' + data)

@socketio.on('disconnect')
def handle_disconnect():
    print_time()
    print('Client disconnected')

if __name__ == '__main__':

    # Start the background task as a thread
    background_thread = threading.Thread(target=background_task)
    background_thread.daemon = True  # Daemonize the thread (stops when the main app stops)
    background_thread.start()


    socketio.run(app, port=5500,host='0.0.0.0',allow_unsafe_werkzeug=True)