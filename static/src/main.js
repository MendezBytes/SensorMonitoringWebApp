$(document).ready(function() {

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
    let socketConfigs = [{
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

    function convertCelsiusToFahrenheit(tempInCelsius) {
        if (tempInCelsius === 888) {
            return 888; // Handle the special case
        }
        const fahrenheit = (tempInCelsius * 9 / 5) + 32;
        return fahrenheit.toFixed(2);
    }

    function drawGraph(data) {
        let endTime = performance.now() - beginTime;
        //Based on response type we handle the message differently

        $(".sensor_data").show();

        //First find the sensor id for this list and clear all elements
        let table_body = $(`#sensor_1_table`)
        let sensor_array = data.sensor_data;
        //intialize the data to draw the graph
        let temp_points = []
        let alt_points = []
        let timestamp_points = []
        table_body.empty()
        sensor_array.forEach((sensor) => {
            let reading_timestamp;
            let timestamp;
            let source

            //Format the datetime
            source = "Flask"
            timestamp = moment(sensor.timestamp)
            reading_timestamp = timestamp.format('MMMM Do YYYY, h:mm:ss a')


            //Append the row data tot eh right table body
            row = `<tr>
                                                <td>1</td>
                                                <td>${reading_timestamp}</td>
                                                <td class="C_val">${sensor.temp}</td>
                                                <td class="F_val">${convertCelsiusToFahrenheit(sensor.temp)}</td>
                                                <td>${sensor.alt}</td>
                                                <td>${source}</td>
                            </tr>`
            table_body.append(row)
            //Also append points for the graph
            temp_points.push(sensor.temp)
            alt_points.push(sensor.alt)
            timestamp_points.push(timestamp.format("YYYY-MM-DDTHH:mm:ss.sssZ"))

        })


        //Create the chart data
        let temp_data = {
            name: 'Temperature',
            data: temp_points
        }
        let alt_data = {
            name: 'Altitude',
            data: alt_points
        }
        //Intialize the Temperature chart but filter out error vals with 0
        let tempChartData = JSON.parse(JSON.stringify(sLineArea));
        tempChartData.series = [temp_data]
        tempChartData.xaxis.categories = timestamp_points
        tempChartData.yaxis.title.text = "Temperature °C"
        //Intialize the Altitude chart
        let altChartData = JSON.parse(JSON.stringify(sLineArea));
        altChartData.series = [alt_data]
        altChartData.xaxis.categories = timestamp_points
        altChartData.yaxis.title.text = "Altitdue m"

        //Empty the charts
        $(`#sensor_1_temp_graph`).empty()
        $(`#sensor_1_alt_graph`).empty()
        //Draw the charts
        let temp_chart = new ApexCharts(
            document.querySelector(`#sensor_1_temp_graph`),
            tempChartData
        );
        let alt_chart = new ApexCharts(
            document.querySelector(`#sensor_1_alt_graph`),
            altChartData
        );

        temp_chart.render();
        alt_chart.render();



        // Then we display the request timing
        let fetch_time_elem = $('#bulkResultsTime')
        let fetch_time_text = ` <h5 style="display: inline-block;">Time taken to fetch results:</h5>
                                    <h5 style="display: inline-block;" class="m-lg-2 mb-4">${endTime.toFixed(4)} milliseconds</h5>`
        fetch_time_elem.empty()
        fetch_time_elem.append(fetch_time_text)
        //Show the data


        formatTemps()
        console.log(data)
    }

    function socketConnection(socketConfig) {
        //First connect to the websocket

        var socketUrl = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
        let socket_obj = {}
        socket_obj['name'] = socketConfig.serverType
        socket_obj['connection'] = io.connect(socketUrl)
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
                //  handleMessage(data);
            }
        });



        socketConnections.push(socket_obj)
    }

    //Error notification
    function showErrorNotif(text) {
        Snackbar.show({
            text: text,
            pos: 'top-center',
            actionTextColor: '#fff',
            backgroundColor: '#e7515a'
        });

    }

    //Success notification function
    function showSuccessNotif(text) {
        Snackbar.show({
            text: text,
            pos: 'top-center',
            actionTextColor: '#fff',
            backgroundColor: '#00ab55'
        });

    }


    //Function for listners
    $(".flaskBtn").click(function(data) {
        let id = $(this).parent().parent().children()[0].innerText;
        getSensorData(id, "flask")
    });

    //Function for listeners
    $(".tornadoBtn").click(function(data) {
        let id = $(this).parent().parent().children()[0].innerText;
        getSensorData(id, "tornado")
    });

    async function fetchAllData(server) {

        //Take a snapshot of the time
        beginTime = performance.now()
        const response = await fetch('/getMeasurments');
        if (!response.ok) {
            console.log("Error in fetching sensor data ")
        }

        const data = await response.json();
        drawGraph(data);


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