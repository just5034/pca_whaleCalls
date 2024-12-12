// Set up dimensions for both plots
const width = 800;
const height = 400;
const margin = {top: 40, right: 150, bottom: 60, left: 60};

// Create the scatter plot SVG container
const scatterSvg = d3.select("#plot")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Create the histogram SVG container
const histSvg = d3.select("#plot")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("style", "margin-top: 40px");

// Add tooltip div
const tooltip = d3.select("#plot")
  .append("div")
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "1px solid black")
  .style("padding", "10px")
  .style("border-radius", "5px")
  .style("opacity", 0);

// Load and process data
d3.json("scripts/metrics_data.json").then(function(data) {
    // Create scales for scatter plot
    const x = d3.scaleLinear()
        .domain([d3.min(data, d => d.snr) * 0.95, d3.max(data, d => d.snr) * 1.05])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.ssim) * 0.9999, d3.max(data, d => d.ssim) * 1.0001])
        .range([height - margin.bottom, margin.top]);

    // Create histogram scales
    const xHistSNR = d3.scaleLinear()
        .domain([d3.min(data, d => d.snr) * 0.95, d3.max(data, d => d.snr) * 1.05])
        .range([margin.left, width/2 - margin.right/2]);

    const xHistSSIM = d3.scaleLinear()
        .domain([d3.min(data, d => d.ssim) * 0.9999, d3.max(data, d => d.ssim) * 1.0001])
        .range([width/2 + margin.left/2, width - margin.right]);

    // Create histogram generators
    const histGenSNR = d3.histogram()
        .value(d => d.snr)
        .domain(xHistSNR.domain())
        .thresholds(xHistSNR.ticks(15));

    const histGenSSIM = d3.histogram()
        .value(d => d.ssim)
        .domain(xHistSSIM.domain())
        .thresholds(xHistSSIM.ticks(15));

    // Create color scale
    const color = d3.scaleOrdinal()
        .domain(["No Signal", "Signal"])
        .range(["#87CEEB", "#FA8072"]);

    // Add dropdown for method selection
    const methods = ["All Methods", ...new Set(data.map(d => d.method))];
    
    d3.select("#plot")
        .insert("select", "svg")
        .style("margin-bottom", "10px")
        .selectAll("option")
        .data(methods)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Add axes to scatter plot
    scatterSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width/2)
        .attr("y", 40)
        .attr("fill", "black")
        .text("Signal to Noise Ratio (SNR)");

    scatterSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height/2)
        .attr("y", -40)
        .attr("fill", "black")
        .text("Structural Similarity Index (SSIM)");

    // Add x-axes to histogram SVG
    histSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xHistSNR))
        .append("text")
        .attr("x", margin.left + (width/4))
        .attr("y", 40)
        .attr("fill", "black")
        .text("SNR Distribution");

    histSvg.append("g")
        .attr("transform", `translate(${width/2 + margin.left/2},${height - margin.bottom})`)
        .call(d3.axisBottom(xHistSSIM))
        .append("text")
        .attr("x", margin.left + (width/4))
        .attr("y", 40)
        .attr("fill", "black")
        .text("SSIM Distribution");

    // Add y-axes to histograms
    histSvg.append("g")
        .attr("class", "snr-y-axis")
        .attr("transform", `translate(${margin.left},0)`);

    histSvg.append("g")
        .attr("class", "ssim-y-axis")
        .attr("transform", `translate(${width/2 + margin.left/2},0)`);

    // Add titles
    scatterSvg.append("text")
        .attr("x", width/2)
        .attr("y", margin.top/2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("SNR vs SSIM Comparison");

    // Add legend to scatter plot
    const legend = scatterSvg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    legend.selectAll("circle")
        .data(["No Signal", "Signal"])
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 25)
        .attr("r", 6)
        .attr("fill", d => color(d));

    legend.selectAll("text")
        .data(["No Signal", "Signal"])
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", (d, i) => i * 25 + 5)
        .text(d => d);

    // Function to update both visualizations
    function updatePlots(selectedMethod) {
        const filteredData = selectedMethod === "All Methods" 
            ? data 
            : data.filter(d => d.method === selectedMethod);

        // Update scatter plot points
        const points = scatterSvg.selectAll("circle.point")
            .data(filteredData);

        points.exit().remove();

        points
            .attr("cx", d => x(d.snr))
            .attr("cy", d => y(d.ssim));

        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.snr))
            .attr("cy", d => y(d.ssim))
            .attr("r", 6)
            .attr("fill", d => color(d.group))
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Method: ${d.method}<br/>
                            Image: ${d.image_index}<br/>
                            SNR: ${d.snr.toFixed(3)}<br/>
                            SSIM: ${d.ssim.toFixed(4)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Compute histograms
        const snrBinsNoSignal = histGenSNR(filteredData.filter(d => d.group === "No Signal"));
        const snrBinsSignal = histGenSNR(filteredData.filter(d => d.group === "Signal"));
        const ssimBinsNoSignal = histGenSSIM(filteredData.filter(d => d.group === "No Signal"));
        const ssimBinsSignal = histGenSSIM(filteredData.filter(d => d.group === "Signal"));

        // Set y scale for histograms
        const yHistSNR = d3.scaleLinear()
            .domain([0, Math.max(
                d3.max(snrBinsNoSignal, d => d.length),
                d3.max(snrBinsSignal, d => d.length)
            )])
            .range([height - margin.bottom, margin.top]);

        const yHistSSIM = d3.scaleLinear()
            .domain([0, Math.max(
                d3.max(ssimBinsNoSignal, d => d.length),
                d3.max(ssimBinsSignal, d => d.length)
            )])
            .range([height - margin.bottom, margin.top]);

        // Update y-axes
        histSvg.select(".snr-y-axis")
            .transition()
            .duration(500)
            .call(d3.axisLeft(yHistSNR));

        histSvg.select(".ssim-y-axis")
            .transition()
            .duration(500)
            .call(d3.axisLeft(yHistSSIM));

        // Update SNR histogram
        // No Signal bars
        histSvg.selectAll(".snr-bar-no-signal")
            .data(snrBinsNoSignal)
            .join("rect")
            .attr("class", "snr-bar-no-signal")
            .attr("x", d => xHistSNR(d.x0))
            .attr("y", d => yHistSNR(d.length))
            .attr("width", d => xHistSNR(d.x1) - xHistSNR(d.x0) - 1)
            .attr("height", d => height - margin.bottom - yHistSNR(d.length))
            .attr("fill", color("No Signal"))
            .attr("opacity", 0.5);

        // Signal bars
        histSvg.selectAll(".snr-bar-signal")
            .data(snrBinsSignal)
            .join("rect")
            .attr("class", "snr-bar-signal")
            .attr("x", d => xHistSNR(d.x0))
            .attr("y", d => yHistSNR(d.length))
            .attr("width", d => xHistSNR(d.x1) - xHistSNR(d.x0) - 1)
            .attr("height", d => height - margin.bottom - yHistSNR(d.length))
            .attr("fill", color("Signal"))
            .attr("opacity", 0.5);

        // Update SSIM histogram
        // No Signal bars
        histSvg.selectAll(".ssim-bar-no-signal")
            .data(ssimBinsNoSignal)
            .join("rect")
            .attr("class", "ssim-bar-no-signal")
            .attr("x", d => xHistSSIM(d.x0))
            .attr("y", d => yHistSSIM(d.length))
            .attr("width", d => xHistSSIM(d.x1) - xHistSSIM(d.x0) - 1)
            .attr("height", d => height - margin.bottom - yHistSSIM(d.length))
            .attr("fill", color("No Signal"))
            .attr("opacity", 0.5);

        // Signal bars
        histSvg.selectAll(".ssim-bar-signal")
            .data(ssimBinsSignal)
            .join("rect")
            .attr("class", "ssim-bar-signal")
            .attr("x", d => xHistSSIM(d.x0))
            .attr("y", d => yHistSSIM(d.length))
            .attr("width", d => xHistSSIM(d.x1) - xHistSSIM(d.x0) - 1)
            .attr("height", d => height - margin.bottom - yHistSSIM(d.length))
            .attr("fill", color("Signal"))
            .attr("opacity", 0.5);
    }

    // Add event listener to dropdown
    d3.select("select").on("change", function() {
        updatePlots(this.value);
    });

    // Initial visualization
    updatePlots("All Methods");
});