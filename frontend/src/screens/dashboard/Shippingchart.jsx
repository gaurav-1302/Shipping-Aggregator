// Import necessary modules and components from React, ApexCharts, and Firebase.
import React, { useEffect, useState } from 'react';
import ApexCharts from "apexcharts";
import { db } from '../../firebase.config';
import { query, getDocs, collection, where } from 'firebase/firestore';
import { toast } from 'react-toastify';

/**
 * @component Shippingchart
 * @description This component displays a donut chart representing the distribution of order statuses.
 * It fetches orders from Firestore, categorizes them by status, and renders the chart using ApexCharts.
 */
function Shippingchart() {

    // State to store the current user's ID.
    const [userId, setUserId] = useState('');

    /**
     * @function useEffect - Fetch User ID
     * @description Fetches the current user's ID from local storage and updates the userId state.
     */
    useEffect(() => {
        try {
            const currentUser = localStorage.getItem('umaxshipuser');
            const jsonData = JSON.parse(currentUser);
            if (jsonData) {
                setUserId(jsonData.uid);
            }
        } catch (error) {
            toast.error("Error while fetching user details")
            console.error("Error parsing user data:", error);
        }
    }, [])

    // State to store the list of orders.
    const [ordersList, setOrdersList] = useState([]);

    /**
     * @function fetchOrders
     * @description Fetches orders from Firestore for the current user.
     */
    const fetchOrders = async () => {
        try {
            // Query to fetch orders where the user_id matches the current user's ID.
            const q = query(collection(db, "orders"), where("user_id", "==", userId));
            const querySnapshot = await getDocs(q);

            let orders = [];

            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                orders.push({ ...docData, id: doc.id });
            });

            // Update the ordersList state with the fetched orders.
            setOrdersList(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
            // Handle errors appropriately (e.g., display error message to user)
        }
    };

    /**
     * @function useEffect - Fetch Orders
     * @description Fetches orders whenever the userId changes.
     */
    useEffect(() => {
        fetchOrders();
    }, [userId])

    const [unshipped, setUnshipped] = useState(1);
    const [readyToShip, setReadyToShip] = useState(1);
    const [pickupScheduled, setPickupScheduled] = useState(1);
    const [menifested, setMenifested] = useState(1);
    const [pickupException, setPickupException] = useState(1);
    const [shipped, setShipped] = useState(1);
    const [inTransit, setInTransit] = useState(1);
    const [delivered, setDelivered] = useState(1);

    /**
     * @function countUnshippedOrders
     * @description Counts the number of orders with the status "UNSHIPPED".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of unshipped orders.
     */
    function countUnshippedOrders(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "UNSHIPPED");
        return unshippedOrders.length;
    }

    /**
     * @function countReadyToShip
     * @description Counts the number of orders with the status "READY TO SHIP".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of orders ready to ship.
     */
    function countReadyToShip(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "READY TO SHIP");
        return unshippedOrders.length;
    }

    /**
     * @function countPickupScheduled
     * @description Counts the number of orders with the status "PICKUP SCHEDULED".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of orders with pickup scheduled.
     */
    function countPickupScheduled(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "PICKUP SCHEDULED");
        return unshippedOrders.length;
    }

    /**
     * @function countMenifested
     * @description Counts the number of orders with the status "MANIFESTED".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of manifested orders.
     */
    function countMenifested(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "MANIFESTED");
        return unshippedOrders.length;
    }

    /**
     * @function countPickupException
     * @description Counts the number of orders with the status "PICKUP EXCEPTION".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of orders with pickup exception.
     */
    function countPickupException(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "PICKUP EXCEPTION");
        return unshippedOrders.length;
    }

    /**
     * @function countShipped
     * @description Counts the number of orders with the status "SHIPPED".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of shipped orders.
     */
    function countShipped(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "SHIPPED");
        return unshippedOrders.length;
    }

    /**
     * @function countIntransit
     * @description Counts the number of orders with the status "IN TRANSIT".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of orders in transit.
     */
    function countIntransit(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "IN TRANSIT");
        return unshippedOrders.length;
    }

    /**
     * @function countDelivered
     * @description Counts the number of orders with the status "DELIVERED".
     * @param {Array} ordersList - The list of orders to filter.
     * @returns {number} The number of delivered orders.
     */
    function countDelivered(ordersList) {
        const unshippedOrders = ordersList.filter(item => item.current_status === "DELIVERED");
        return unshippedOrders.length;
    }

    useEffect(() => {
        if (ordersList.length > 0) {
            setUnshipped(countUnshippedOrders(ordersList))
            setReadyToShip(countReadyToShip(ordersList))
            setPickupScheduled(countPickupScheduled(ordersList))
            setMenifested(countMenifested(ordersList))
            setPickupException(countPickupException(ordersList))
            setShipped(countShipped(ordersList))
            setInTransit(countIntransit(ordersList))
            setDelivered(countDelivered(ordersList))
        }
    }, [ordersList]);

    /**
     * @function getChartOptions
     * @description Configures the options for the ApexCharts donut chart.
     * @returns {object} The chart options object.
     * @see https://apexcharts.com/docs/options/
     * @see https://apexcharts.com/docs/options/plotoptions/pie/
     */
    const getChartOptions = () => {
        return {
            series: [unshipped, readyToShip, pickupScheduled, menifested, inTransit, delivered, pickupException, 0, 0, shipped],
            colors: ["#1C64F2", "#16BDCA", "#FDBA8C", "#16BDCA", "#E74694", "#fb8500", "#ff006e", "#724cf9", "#fe6d73", "#E74694"],
            chart: {
                height: 320,
                width: "100%",
                type: "donut",
            },
            stroke: {
                colors: ["transparent"],
                lineCap: "",
            },
            plotOptions: {
                pie: {
                    donut: {
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontFamily: "Inter, sans-serif",
                                offsetY: 20,
                                color: '#FFFFFF'
                            },
                            total: {
                                showAlways: true,
                                show: true,
                                label: "Total Shipments",
                                fontFamily: "Inter, sans-serif",
                                color: '#FFFFFF',
                                formatter: function () {
                                    return ordersList.length
                                },
                            },
                            value: {
                                show: true,
                                fontFamily: "Inter, sans-serif",
                                offsetY: -20,
                                formatter: function (value) {
                                    return value
                                },
                            },
                        },
                        size: "80%",
                    },
                },
            },
            grid: {
                padding: {
                    top: -2,
                },
            },
            labels: ["Unshipped", "Ready to ship", "Scheduled Pickup", "Manifested", "In-Transit", "Delivered", "Pickup Exception", "RTO In-Transit", "RTO Delivered", "Shipped"],
            dataLabels: {
                enabled: false,
            },
            legend: {
                position: "bottom",
                fontFamily: "Inter, sans-serif",
                color: 'white'
            },
            yaxis: {
                labels: {
                    formatter: function (value) {
                        return value
                    },
                },
            },
            xaxis: {
                labels: {
                    formatter: function (value) {
                        return value
                    },
                },
                axisTicks: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
            },
        }
    }

    /**
     * @function useEffect - Render Chart
     * @description Renders the ApexCharts donut chart and handles cleanup.
     */
    useEffect(() => {
        let chartRendered = false;

        // Create a new ApexCharts instance.
        const chart = new ApexCharts(document.getElementById("donut-chart"), getChartOptions());


        if (document.getElementById("donut-chart") && typeof ApexCharts !== 'undefined') {
            if (!chartRendered) {
                chart.render();
                chartRendered = true; // Mark as rendered
            }
        }

        return () => {
            if (chartRendered && chart) {
                chart.destroy();
            }
            chartRendered = false;
        };
    }, [delivered, unshipped]);

    return (
        <div className="flex mt-5">
            <div class="max-w-sm w-full bg-[#003B49] rounded-lg shadow p-4 md:p-6">

                <div class="flex justify-between mb-3">
                    <div class="flex justify-center items-center">
                        <h5 class="text-xl font-bold leading-none text-white pe-1">Shipment Details</h5>
                    </div>
                </div>

                <div class="py-6" id="donut-chart">
                </div>

                <div class="grid grid-cols-1 items-center border-gray-200 border-t dark:border-gray-700 justify-between">
                    <div class="flex justify-between items-center pt-5">
                        <button
                            id="dropdownDefaultButton"
                            class="text-sm font-medium text-white text-center inline-flex items-center"
                            type="button">
                            All time
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Shippingchart