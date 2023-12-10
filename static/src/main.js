$(document).ready(function () {

    var sLineArea = {
        chart: {
            height: 350,
            type: 'line',
            toolbar: {
                show: false,
            }
        },
        dataLabels: {
            enabled: true
        },
        stroke: {
            curve: 'smooth'
        },
        series: [],

        xaxis: {
            type: 'datetime',
            categories: [],
            "convertedCatToNumeric": false,
            "title": {
                "text": "Time"
            },
        },
        "yaxis": {
            "title": {
                "text": null
            }
        },
        tooltip: {
            x: {
                format: 'HH:mm:ss'
            },
        }
    }


    var beginTime = null;
    var tempSetting = "F"
    let socketConnections = []
    let socketConfigs = [
        {
            serverType: "tornado",
            serverPort: 8888,
            htmlID: "tornadoStatus"
        },
        {
            serverType: "flask",
            serverPort: 5600,
            htmlID: "flaskStatus"
        }

    ]

    function convertFahrenheitToCelsius(tempInFahrenheit) {
        if (tempInFahrenheit === 888) {
            return 888
        }
        const celsius = (tempInFahrenheit - 32) * 5 / 9;
        return celsius.toFixed(2);
    }

    function handleMessage(data) {
        let endTime = performance.now() - beginTime;
        //Based on response type we handle the message differently

        data = JSON.parse(data)
        if (data.type === 1) {
            //First get the sensor id
            sensor_id = data.sensor_data.sensor_num


            //Then fill in the value with the sensor data
            if (data.server === "Flask") {
                //Format the datetime
                let timestamp = moment(data.sensor_data.timestamp)
                $(`#sensor_${sensor_id}_timestamp`).text(timestamp.format('MMMM Do YYYY, h:mm:ss a'))
            } else {
                let timestamp = moment(data.sensor_data.timestamp)
                $(`#sensor_${sensor_id}_timestamp`).text(timestamp.format('MMMM Do YYYY, h:mm:ss a'))
            }
            $(`#sensor_${sensor_id}_temp_F`).text(data.sensor_data.temp_reading)
            $(`#sensor_${sensor_id}_temp_C`).text(convertFahrenheitToCelsius(data.sensor_data.temp_reading))
            $(`#sensor_${sensor_id}_hum`).text(data.sensor_data.hum_reading)
            $(`#sensor_${sensor_id}_error`).text(data.sensor_data.error_count)
            $(`#sensor_${sensor_id}_alarm`).text(data.sensor_data.alarm_count)
            $(`#sensor_${sensor_id}_source`).text(data.server)

            $(`#sensor_${sensor_id}_req_time`).text(`${endTime.toFixed(4)} milliseconds`)

        } else if (data.type === 2) {
            $(".sensor_data").show();
            data.sensor_data.forEach((sensor_array) => {
                //First find the sensor id for this list and clear all elements
                let sensor_id = sensor_array[0].sensor_num
                let table_body = $(`#sensor_${sensor_id}_table`)

                //intialize the data to draw the graph
                let temp_points = []
                let hum_points = []
                let timestamp_points = []
                table_body.empty()
                sensor_array.forEach((sensor) => {
                    let reading_timestamp;
                    let timestamp;
                    let source
                    if (data.server === "Flask") {
                        //Format the datetime
                        source = "Flask"
                        timestamp = moment(sensor.timestamp)
                        reading_timestamp = timestamp.format('MMMM Do YYYY, h:mm:ss a')
                    } else {
                        source = "Tornado"
                        timestamp = moment(sensor.timestamp)
                        reading_timestamp = timestamp.format('MMMM Do YYYY, h:mm:ss a')
                    }

                    //Append the row data tot eh right table body
                    row = `<tr>
                                                <td>${sensor_id}</td>
                                                <td>${reading_timestamp}</td>
                                                <td class="F_val">${sensor.temp_reading}</td>
                                                <td class="C_val">${convertFahrenheitToCelsius(sensor.temp_reading)}</td>
                                                <td>${sensor.hum_reading}</td>
                                                <td>${sensor.error_count}</td>
                                                <td>${sensor.alarm_count}</td>
                                                <td>${source}</td>
                            </tr>`
                    table_body.append(row)
                    //Also append points for the graph
                    temp_points.push(sensor.temp_reading)
                    hum_points.push(sensor.hum_reading)
                    timestamp_points.push(timestamp.format("YYYY-MM-DDTHH:mm:ss.sssZ"))

                })
                //Filter out the badd data with nulls
                for (var i = 0; i < temp_points.length; i++) {
                    if (temp_points[i] === 888) {
                        temp_points[i] = null;
                    }
                }

                for (var i = 0; i < hum_points.length; i++) {
                    if (hum_points[i] === 888) {
                        hum_points[i] = null;
                    }
                }


                //Create the chart data
                let temp_data = {
                    name: 'Temperature',
                    data: temp_points
                }
                let hum_data = {
                    name: 'Humidity',
                    data: hum_points
                }
                //Intialize the Temperature chart but filter out error vals with 0
                let tempChartData = JSON.parse(JSON.stringify(sLineArea));
                tempChartData.series = [temp_data]
                tempChartData.xaxis.categories = timestamp_points
                tempChartData.yaxis.title.text = "Temperature °F"
                //Intialize the Humidity chart
                let humChartData = JSON.parse(JSON.stringify(sLineArea));
                humChartData.series = [hum_data]
                humChartData.xaxis.categories = timestamp_points
                humChartData.yaxis.title.text = "Humidity %"

                //Empty the charts
                $(`#sensor_${sensor_id}_temp_graph`).empty()
                $(`#sensor_${sensor_id}_hum_graph`).empty()
                //Draw the charts
                let temp_chart = new ApexCharts(
                    document.querySelector(`#sensor_${sensor_id}_temp_graph`),
                    tempChartData
                );
                let hum_chart = new ApexCharts(
                    document.querySelector(`#sensor_${sensor_id}_hum_graph`),
                    humChartData
                );

                temp_chart.render();
                hum_chart.render();


            })
            // Then we display the request timing
            let fetch_time_elem = $('#bulkResultsTime')
            let fetch_time_text = ` <h5 style="display: inline-block;">Time taken to fetch results:</h5>
                                    <h5 style="display: inline-block;" class="m-lg-2 mb-4">${endTime.toFixed(4)} milliseconds</h5>`
            fetch_time_elem.empty()
            fetch_time_elem.append(fetch_time_text)
            //Show the data

        }
        formatTemps()
        console.log(data)
    }

    function socketConnection(socketConfig) {
        //First connect to the websocket
        let socket_obj = {}
        socket_obj['name'] = socketConfig.serverType
        socket_obj['connection'] = io.connect(`http://192.168.0.14:${socketConfig['serverPort']}`)
        socket_obj['htmlElement'] = $(`#${socketConfig['htmlID']}`)


        // Handle connection event
         socket_obj['connection'].on('connect', () => {
            socket_obj['htmlElement'].text("Connected")
            socket_obj['htmlElement'].removeClass().addClass("text-success")
            //Show message
            showSuccessNotif(`Connected to ${socket_obj['name']} server`)
        });

         socket_obj['connection'].on('error', () => {
            //Set connections status text
            socket_obj['htmlElement'].text("Disconnected")
            socket_obj['htmlElement'].removeClass().addClass("text-danger")
            //Show message
            showErrorNotif(`Failed to connect to ${socket_obj['name']} server: ` + error)
        });

         socket_obj['connection'].on('close', () => {
            socket_obj['htmlElement'].text("Disconnected")
            socket_obj['htmlElement'].addClass("text-danger")
            //Show message
            showErrorNotif(`Disconnected from ${socket_obj['name']} server`)
        });


         socket_obj['connection'].on('message', (data) => {
        if (data) {
                handleMessage(data);
            }
        });



        socketConnections.push(socket_obj)
    }

    //Error notification
    function showErrorNotif(text) {
        Snackbar.show({
            text: text, pos: 'top-center',
            actionTextColor: '#fff',
            backgroundColor: '#e7515a'
        });

    }

    //Success notification function
    function showSuccessNotif(text) {
        Snackbar.show({
            text: text, pos: 'top-center',
            actionTextColor: '#fff',
            backgroundColor: '#00ab55'
        });

    }


    //Function for listners
    $(".flaskBtn").click(function (data) {
        let id = $(this).parent().parent().children()[0].innerText;
        getSensorData(id, "flask")
    });

    //Function for listeners
    $(".tornadoBtn").click(function (data) {
        let id = $(this).parent().parent().children()[0].innerText;
        getSensorData(id, "tornado")
    });

    function fetchAllData(server) {
        //Based on server use one of the two sockets
        let socket;
        //Choose the right server

        socket = socketConnections[0].connection

        //Create the request object
        let req_obj = {
            type: 2,
        }
        //Take a snapshot of the time
        beginTime = performance.now()
        //Send the message
        socket.send(JSON.stringify(req_obj))
    }

    //Function for listners
    $("#fetchAllFlask").click((event) => {
        fetchAllData("flask")
    });
    $("#fetchAllTornado").click(() => {
        fetchAllData("tornado")
    });


    function getSensorData(sensor_id, server) {
        let socket;
        //Choose the right server

            socket = socketConnections[0].connection

        //Create the request object
        let req_obj = {
            type: 1,
            sensor_id: sensor_id
        }
        //Take a snapshot of the time
        beginTime = performance.now()
        //Send the message
        socket.send(JSON.stringify(req_obj))
    }

    function formatTemps() {
        var checkedId = $('input[name="radio-checked"]:checked').attr("id");

        if (checkedId == "C_RADIO") {
            $(".tempUnit").text("/ °C");
            $(".C_val").show()
            $(".F_val").hide()

        } else if (checkedId == "F_RADIO") {
            $(".tempUnit").text("/ °F");
            $(".C_val").hide()
            $(".F_val").show()
        }
    }

    $('input[name="radio-checked"]').change(() => {
        formatTemps()
    });


    // //Connect to the tornado server
    // socketConnection(socketConfigs[0])
    //Connect to flask server
    socketConnection(socketConfigs[1])


});

