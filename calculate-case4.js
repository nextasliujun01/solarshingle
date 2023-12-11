/// Copyright(C) 2023 - 2033 Solarshingle Canada - All Rights Reserved
/// For case 4, the roof is a parallelogram.
///Constants of SS
const ss_width = 55.63;
const ss_height = 16.73;
const side_diff = 1; // inch
const eave_ss_offset = 2;
const ridge_ss_offset = 13;
const left_right_ss_offset = 4;
const metel_cover_height = 13; // this cover is used when ridge < ease.
const drawing_offset = 10; // to flip the shape. but leave a bit space.

/// global flags
var g_symmetric = false;
var g_rectangle = false;
var g_normal_trapezoidal = false; // normal (top shorter than bottom) vs invert Trapezoidal
var g_parallelogram = false;
var g_left_ref_line = false; // the vertical line on the left or right side.
var g_use_ref_line = false;
var g_invert_eave_short = false;
var g_left_offset_positive = false;
var g_data_is_valid = false;


/// computed values
var cv_real_height = 1;
var cv_real_left_side = 1;
var cv_real_right_side = 1;
var cv_ref_line_x = 0;
var cv_left_gap_x = 0;  // left offset length. This value is to help determine the area of SS, 
                       // it is a bit longer than left_right_ss_offset. 
var cv_right_gap_x = 0; // right offset length.
var cv_total_rows = 0;
var cv_invert_start_y = 0;
var cv_max_ss_in_row = 0;
var cv_tilting_offset = 0;
 

/// measured roof info. These are the data 
const roof1 = {
    eave: 480,
    ridge: 280,
    left_side: 200,
    right_side: 190,
    left_offset: 100, // left_offset + right_offset = ridge-eave (or eave-ridge)
    right_offset: 100,
    height_measured: 190,
    angle: 30 // deg between horizontal line and roof surface.
}

/// for testing purpose if HTML page is not available.
const roof = {
    eave: 280,
    ridge: 380,
    left_side: 290,
    right_side: 220,
    left_offset: 111, // left_offset + right_offset = ridge-eave (or eave-ridge)
    right_offset: 0,
    height_measured: 220,
    angle: 30 // deg between horizontal line and roof surface.
}

/// For keep tracking left/right offset input textbox.
const read_data_status = {
    left_offset: false,
    right_offset: false
}

const symm_line = {
    k: 0.8,
    b: 1
}

// Define array of 4 corners. Need to update values in array. 
var four_corners = [[0, 1], [2, 3], [4, 5], [6, 7]]; // left-bottom, left-top, right-top, right-bottom. 

var four_ss_corners = [];

/// For testing (Try it) button
function save_data() {
    //console.log(four_ss_corners);
    console.log("In save_data()"); 
    var j = JSON.stringify(four_ss_corners);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(four_ss_corners, "SS", 2)], {
        type: "application/json"
    }));
    a.setAttribute("download", "data000.json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


/// For calculating final results
function find_linear_inch() {
    var height = cv_total_rows * ss_height;
    var width = cv_max_ss_in_row * ss_width; 
    var num_ss = four_ss_corners.length / 8;
    document.getElementById('num_ss').value = num_ss;
    document.getElementById('perimeter').value = Math.ceil((2 * height + 2 * width)/12.0);
}


//////// Find Number of SS in each row
// The roof is parallelogram, the center of the tile top-edge is put at the middle between left and right.
// Since the height of tile (or SS) and tilted shape, the actual length for putting tile is less than the eave. 
function  test_case4() {
    if (four_ss_corners.length > 0) {
        four_ss_corners.length = 0;
        console.log("four_ss_corners : " + four_ss_corners.length);
    }
    g_parallelogram = true;
    console.log("roof angle " + roof.angle);
    cv_real_height = find_real_height(roof.angle, roof.height_measured);
    // from real_height and offset, find the x-direction offset due to tilting
    console.log("real height " + cv_real_height); 
    var total_rows = find_total_rows(cv_real_height, eave_ss_offset, ridge_ss_offset);
    console.log("Total rows  " + total_rows);
    cv_total_rows = total_rows;
    find_real_side_length(cv_real_height, roof);
    if (cv_real_left_side > 0) {
        cv_real_right_side = cv_real_left_side;
    }
    else {
        cv_real_left_side = cv_real_right_side;
    }
    if (roof.left_offset > 0) {
        g_left_offset_positive = true;
    }
    else {
        g_left_offset_positive = false; 
    }
    console.log("Real left side length ", cv_real_left_side);
    console.log("Real right side length ", cv_real_right_side);
    find_corner_coord_case4(roof, cv_real_height);
    console.log("Coordinates " + four_corners);
    console.log("normal or invert shape " + g_normal_trapezoidal);
    find_gaps(roof);
    find_symm_line_in_parallelogram(roof);
    find_parallelogram_ss(roof);
    find_linear_inch();
}

 
/// From y value to find ss per row by using triangle. 
/// The ss_per_row is calculated based on the row above the current row.
/// This method is used to ensure SS of the current row can be covered by metal covers.
function find_normal_ss_per_row(roof, start_y, row, y1,y2 ) {
    //var y1 = Math.floor(start_y + row * ss_height); // bottom of SS (level N + 1) in document.
    //var y2 = Math.floor(start_y + (row + 1) * ss_height); // top of SS (level N + 1)
    var next_top = Math.floor(start_y + (row + 1) * ss_height + ss_height); // top of next level (level N+2).
    //var row_next = row + 1;

    // current no of SS and row_width
    var row_width_current = find_width_of_SS(roof, roof.eave, y2);
    var ss_per_row_current = Math.floor(row_width_current / ss_width);

    // no of ss on row_n2.
    var row_width_next = find_width_of_SS(roof, roof.eave, next_top);
    var ss_per_row_next = Math.floor(row_width_next / ss_width);
    console.log("2 width   " + row_width_current + ",  " + row_width_next);
    console.log("current ss and next ss " + ss_per_row_current + " ,  " + ss_per_row_next);
    var ss_per_row = ss_per_row_next;
    return ss_per_row; 
}

  
/// For parallelogram shape, the length of every row is the same. 
/// Only need to calculate once. 
function find_parallelogram_ss(roof) {
    // always start from eave side:
    if (g_parallelogram) {
        console.log("testing parallelogram... ")
        console.log("total rows " + cv_total_rows);
        // Need to remove x-offset due to tilting. call it tilting_offset; 
        var actual_width = find_tilting_width(roof);

        var ss_per_row = Math.floor(actual_width / ss_width);
        console.log("ss per row " + ss_per_row);

        cv_max_ss_in_row = ss_per_row;

        // total ss length
        var ss_length = ss_per_row * ss_width;
        var first_y = eave_ss_offset + ss_height / 2;
        // Need to find the x-offset outside of roof due to tilting. 
        // from the equation, find (x, y)
        var center_x = (first_y - symm_line.b)/ symm_line.k;

        var start_x = center_x - ss_length / 2;
        console.log("start x " + start_x);
        console.log("start y " + first_y);

        var start_y = eave_ss_offset;
        for (let row = 0; row < cv_total_rows; row++) {
            var y1 = Math.floor(start_y + row * ss_height); // use y of the top of the row.
            var y2 = Math.floor(start_y + (row + 1) * ss_height);
            var mid_y = Math.floor(start_y + (row + 0.5)* ss_height);
            var center_x = (mid_y - symm_line.b) / symm_line.k;
            var start_x = center_x - ss_length / 2;
            for (let col = 0; col < ss_per_row; col++) {
                var left = Math.floor(col * ss_width + start_x);
                console.log("Left " + left);
                var right = Math.floor(left + ss_width);
                console.log("y1 " + y1);
                four_ss_corners.push(left, y1, left, y2, right, y2, right, y1);
            }
            console.log("Current coodinate " + four_ss_corners.length);
        }
    }
}


///Fill four_ss_corners in a row. 
function get_ss_per_row(ss_per_row, ss_width, start_x, y1, y2) {
    for (let col = 0; col < ss_per_row; col++) {
        var left = Math.floor(col * ss_width + start_x);
        //console.log("Left " + left);
        var right = Math.floor(left + ss_width);
        //console.log("y1 " + y1);
        four_ss_corners.push(left, y1, left, y2, right, y2, right, y1);
    }
}


//////// Utility functions
/// find the center of a parallelogram.
/// This will be used for determine start-x position of each row of SS. 
function find_symm_line_in_parallelogram(roof) {
    // use four_corners[], find mid of 0 & 3, 2&3.
    var x1 = (four_corners[0][0] + four_corners[3][0]) / 2;
    var x2 = (four_corners[1][0] + four_corners[2][0]) / 2;
    var y1 = 0;
    var y2 = cv_real_height;
    var k = y2 / (x2 - x1);
    var b = (-x1 * y2) / (x2 - x1);
    symm_line.k = k;
    symm_line.b = b; 

}


///// This function is only for getting x-offset outside roof 
///// May not needed. 
//function find_x_offset_by_y(roof, y) {
//    var offset = roof.left_offset;
//    if (offset == 0) {
//        offset = roof.right_offset;
//    }
//    var x_start = 0;
//    if (g_left_offset_positive == false) { // use  /_/ shape roof
//        var x = offset * y / cv_real_height;
//        return x;
//    }
//    else {
//        var x = offset * (cv_real_height - y) / cv_real_height;
//        return x; 
//    }
//}
/// Find the width to put ss 
function find_tilting_width(roof) {
    var offset = roof.left_offset;
    if (offset == 0) {
        offset = roof.right_offset;
    }
    // Need to use offset and real height. 
    // for each row of SS, the middle of its top edge is aligned to the "symmetric line" of the parallelogram (i.e. the center in x-direction)
    var y = eave_ss_offset + ss_height;
    var x = offset * y / cv_real_height; // this is the x-offset value at the bottom of SS of length of the top-edge of SS.
    cv_tilting_offset = x; 
    // because the center of SS is align to the middle of parallelogram, 
    var temp = (roof.eave - cv_left_gap_x - cv_right_gap_x) / 2;
    temp = temp - x;
    var width = temp * 2;
    return width; 
 
}


/// This function is only for invert trapezoidal.
/// set g_invert_eave_short = true if it is shorter than one SS. 
function check_width_for_first_row(roof) {
    var t1 = roof.eave - cv_left_gap_x - cv_right_gap_x - ss_width;
    console.log("t1 " + t1);
    if (t1 < 0) {
        g_invert_eave_short = true;
    }
    else {
        g_invert_eave_short = false;
    }
}


/// First row position for invert trapezoidal when eave is shorter than 1 SS.
/// This is a special case: when the eave side is very short, it may be not possible to put even 1 SS 
/// Need to put the first SS at a bit higher place (> 2 inches). 
function first_y_for_invert(roof) {
    console.log("in first y ");
    var t1 = roof.ridge - cv_left_gap_x - cv_right_gap_x - ss_width;
    var t2 = roof.left_offset / roof.right_offset + 1;
    var r2 = t1 / t2;
    // use r2 to find y. Relationship: H/Roff = (H-y) / R2
    var y = cv_real_height * (1 - r2 / roof.right_offset); // r2 < right_offset! 
    console.log("y " + y);
    return y;
}


/// Based on the y value, find the distance between two sides of area for SS. 
function find_width_of_SS(roof, roof_width, y) {
    if (g_rectangle) {
        console.log("Wrong function, no need to get width for SS since roof is rectangle... ");
        return -1;
    }
    var width_ss_row = 0;
    if (g_symmetric) {
        if (g_normal_trapezoidal) {
            // the x-offset given y outside of traperoidal.  // y increase, x also increases
            var x_left = roof.left_offset * y / cv_real_height;
            var x_right = roof.right_offset * y / cv_real_height;
            width_ss_row = roof_width - x_left - x_right - cv_left_gap_x - cv_right_gap_x;
        }
        else {
            var x_left = roof.left_offset * (cv_real_height - y ) / cv_real_height;
            var x_right = roof.right_offset * (cv_real_height - y) / cv_real_height;
            width_ss_row = roof_width - x_left - x_right - cv_left_gap_x - cv_right_gap_x;
            console.log("y = " + y + " x_left " + x_left + "x_right " + x_right);
            console.log("cv_left_gap_x and cv_right_gap_x " + cv_left_gap_x + "  " + cv_right_gap_x);
        }
    }
    else {
        if (g_use_ref_line) {
            width_ss_row = find_width_of_SS_non_sym(roof, roof_width, y);
        }
        else {
            console.log("Need to ger reference line info first. exit.... ");
            return -1; 
        }
    }
    return width_ss_row;
}


/// Handle non-symmetric case:
function find_width_of_SS_non_sym(roof, roof_width, y) {
    if (g_use_ref_line == false) {
        console.log(" Need to use reference line... something not correct... exit!");
        return;
    }
    var width_ss_row = 0;
    if (g_normal_trapezoidal) {
        if (g_left_ref_line) {
            // reference line is on the left side:
            var x_right = roof.right_offset * y / cv_real_height;
            width_ss_row = roof_width - cv_ref_line_x - x_right - cv_right_gap_x;
        }
        else { // ref_line on the right side.
            var x_left = roof.left_offset * y / cv_real_height;
            width_ss_row = cv_ref_line_x - x_left - cv_left_gap_x;
        }
    }
    else {
        // invert shape.
        if (g_left_ref_line) {
            var x_right = roof.right_offset * (cv_real_height - y) / cv_real_height;
            width_ss_row = roof_width - x_right  - cv_right_gap_x - cv_ref_line_x;
        }
        else { // reference line is on the right side:
            var x_left = roof.left_offset * (cv_real_height - y) / cv_real_height;
            width_ss_row = cv_ref_line_x - x_left - cv_left_gap_x;
        }
    }
    return width_ss_row; 
}


/// Need to use actual height instead of height measured from map. 
function find_corner_coord_case4(roof, actual_height) {
    if (g_left_offset_positive == true) { // \_\ shape
        four_corners[0][0] = roof.left_offset;
        four_corners[0][1] = 0;
        four_corners[1][0] = 0;
        four_corners[1][1] = actual_height;
        four_corners[2][0] = roof.eave;
        four_corners[2][1] = actual_height;
        four_corners[3][0] = roof.left_offset + roof.eave;
        four_corners[3][1] = 0;
    }
    else { //  /_/ shape
        four_corners[0][0] = 0;
        four_corners[0][1] = 0;
        four_corners[1][0] = roof.right_offset;
        four_corners[1][1] = actual_height;
        four_corners[2][0] = roof.right_offset + roof.eave;
        four_corners[2][1] = actual_height;
        four_corners[3][0] = roof.eave;
        four_corners[3][1] = 0;

    }
}

 
// Find the gap of two sides for all trapezoidal shapes.
// The distance between roof edge and the area of SS on both left/right sides 
// is fixed to left_right_ss_offset. But we need to find the actual x-distance to
// simplified the computation of number of SS in each row etc. 
function find_gaps(roof) {
    // Find x-distance given the distance between roof edge and SS area (i.e. gap btw two parallel lines):
    // Two triangles share the same angle (lower left corner), hence: 
    cv_left_gap_x = cv_real_left_side * left_right_ss_offset / cv_real_height;
    cv_right_gap_x = cv_real_right_side * left_right_ss_offset / cv_real_height;
}


///TODO: merge these two functions
/// Use height (distance between eave and ridge)
function find_total_rows(sb_height, bottom_offset, top_offset) { 
    var total_height = (sb_height - bottom_offset - top_offset) / ss_height;
    console.log("t " + total_height);
    var total_rows = Math.floor(total_height);
    return total_rows;
}

 
/// Use the length of the left and right side to determine if roof is symmetric.
/// Use left-offset and right-offset is also possible.
function check_symmetric(roof) {
    var symmetric = false;
      
    if (Math.abs(roof.left_offset - roof.right_offset) < side_diff) {
        symmetric = true;
    }
    else {
        symmetric = false;
    }
    console.log(symmetric);
    return symmetric;
}


/// for symmetric shape. Find height
function check_rectangle(roof) {
    var rect = false;
    if (Math.abs(roof.eave - roof.ridge) < 1) {
        rect = true;
    }
    return rect; 
}


/// Find the "actual height" of roof which is the distance from eave to ridge. 
function find_real_height(angle, heigh_measured) {
    var angle_rad = angle * Math.PI / 180.0;
    var real_height = heigh_measured / Math.cos(angle_rad);
    return Math.floor(real_height); 
}


/// Use side_offset and actual height to get real_side_length.
function find_real_side_length(actual_height, roof) {
    cv_real_left_side = 0;
    cv_real_right_side = 0;
    if (roof.left_offset > 0) {
        var t = Math.sqrt(roof.left_offset * roof.left_offset + actual_height * actual_height);
        cv_real_left_side = Math.floor(t);
         
    }
    if (roof.right_offset > 0) {
        var t = Math.sqrt(roof.right_offset * roof.right_offset + actual_height * actual_height);
        cv_real_right_side = Math.floor(t);
    }
}


//// Draw() function 
function draw() {

    const canvas = document.querySelector('#canvas');
    if (canvas.getContext) {
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var y_upper = cv_real_height + drawing_offset;

        console.log("height " + canvas.height);
        console.log("y_upper " + y_upper);
        //drawLine(ctx, [100, 100], [100, 300], 'green', 5);
        for (let i = 0; i < 4; i++) {
            drawLine(ctx, [four_corners[i][0], y_upper - four_corners[i][1]], [four_corners[(i + 1) % 4][0], y_upper - four_corners[(i+1)%4][1]], 'green', 3);
        }
        if (g_parallelogram == false ) {
            drawLine(ctx, [cv_ref_line_x, drawing_offset], [cv_ref_line_x, cv_real_height + drawing_offset], 'red', 2);
        }
       
        
        var total = four_ss_corners.length;
        //for (let i = 0; i < total; i=i+2) {
        //    drawCircles(ctx, four_ss_corners[i], four_ss_corners[i + 1], 1);
        //}
        var total_ss = total / 8;
        for (let i = 0; i < total_ss; i = i + 1) {
            drawLine(ctx, [four_ss_corners[i * 8], y_upper - four_ss_corners[i * 8 + 1]], [four_ss_corners[i * 8 + 2], y_upper - four_ss_corners[i * 8 + 3]], 'blue', 2);
            drawLine(ctx, [four_ss_corners[i * 8 + 2], y_upper - four_ss_corners[i * 8 + 3]], [four_ss_corners[i * 8 + 4], y_upper - four_ss_corners[i * 8 + 5]], 'blue', 2);
            drawLine(ctx, [four_ss_corners[i * 8 + 4], y_upper - four_ss_corners[i * 8 + 5]], [four_ss_corners[i * 8 + 6], y_upper - four_ss_corners[i * 8 + 7]], 'blue', 2);
            drawLine(ctx, [four_ss_corners[i * 8 + 6], y_upper - four_ss_corners[i * 8 + 7]], [four_ss_corners[i * 8], y_upper - four_ss_corners[i * 8 + 1]], 'blue', 2);
        }
        //drawLine(ctx, [0, canvas.height], [canvas.width, canvas.height], 'black', 4);
        //drawLine(ctx, [0, 0], [canvas.width, 0], 'black', 4);

        //drawLine(ctx, [2, 2], [2, canvas.heighth], 'black', 4);
        //drawLine(ctx, [canvas.width, 0], [canvas.width, canvas.height], 'black', 4);
        var x1 = Math.floor ((four_corners[0][0] + four_corners[3][0]) / 2) - 1;
        var x2 = Math.floor ((four_corners[1][0] + four_corners[2][0]) / 2) - 1 ;
        var y1 = y_upper - 0;
        var y2 = y_upper - cv_real_height;
        if (g_parallelogram) {
            drawLine(ctx, [x1, y1], [x2, y2], 'red', 1);
        }
     
    }
}


function drawLine(ctx, begin, end, stroke = 'black', width = 1) {
    if (stroke) {
        ctx.strokeStyle = stroke;
    }

    if (width) {
        ctx.lineWidth = width;
    }

    ctx.beginPath();
    ctx.moveTo(...begin);
    ctx.lineTo(...end);
    ctx.stroke();
}


function drawCircles(ctx, centerX, centerY, radius) {
    let circle = new Path2D();  // <<< Declaration
    circle.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);

    ctx.fillStyle = 'yellow';
    ctx.fill(circle); //   <<< pass circle to ctx

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000066';
    ctx.stroke(circle);  // <<< pass circle here too
}


///// For Input Data.... 
function check_input(val) {
    // const regex = new RegExp(/[^0-9]/, 'g');
    const regex = new RegExp(/^ [+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/)
    var status = true;
    if (val.match(regex)) {
        alert("Must be a valid number");
        status = false; 
    }
    return status;
}


/// Get data from textbox on webpage.
/// Calling check_input is not needed as data field is set to number type only. 
function read_data() {
    var status_left_offset = false;
    var status_right_offset = false;

    var eave = document.getElementById('eave').value;
    var ridge = eave;
    //var ridge = document.getElementById('ridge').value;


    var left_offset = document.getElementById('left_offset').value;
    var right_offset = document.getElementById('right_offset').value;
    var height_measured = document.getElementById('height_measured').value;
    var angle = document.getElementById('angle').value;
    console.log("read data as " + eave + "   " + ridge);
    //console.log("read data as " + left_side + "   " + right_side);
    console.log("left_offset : " + left_offset + " right_offset: " + right_offset);
    console.log("height measured " + height_measured + " angle:  " + angle);

    if (check_input(eave) == false) {
        return;
    }
    //if (check_input(ridge) == false) {
    //    return;
    //}

    if (check_input(left_offset) == false) {
        return;
    }
    if (check_input(right_offset) == false) {
        return;
    }
    if (check_input(height_measured) == false) {
        return;
    }
    if (check_input(angle) == false) {
        return;
    }

    roof.eave = Number(eave);
    roof.ridge = Number(ridge);

 
    if (left_offset == "") {
        status_left_offset = false;
        console.log("left_offset is null ");
    }
    else {
        status_left_offset = true;
        console.log("left_offset has value ");
    }
    
    if (right_offset == "") {
        status_right_offset = false;
        console.log("right_offset is null ");
    }
    else {
        status_right_offset = true;
        console.log("Right offset has value ");
    }
    roof.left_offset = Number(left_offset);
    roof.right_offset = Number(right_offset);
    roof.height_measured = Number(height_measured);
    roof.angle = Number(angle);
    console.log("roof info ---- ");
    console.log(roof);
    if ((status_left_offset == false) && (status_right_offset == false) ) {
        alert("You need to enter at least one of left_offset or right_offset...! ");

    }
    read_data_status.left_offset = status_left_offset;
    read_data_status.right_offset = status_right_offset;
}


///
function validate_and_update_data() {
    if ((roof.left_offset > 0) && (roof.right_offset > 0)) {
        console.log("Both offsets > 0 ");
        alert("Data is not valid.. stop");
        return false;
    }
    else {
        if (roof.left_offset > 0) {
            roof.right_offset = 0;
            document.getElementById("right_offset").value = Number(0);
        }
        else {
            roof.left_offset = 0;
            document.getElementById("left_offset").value = Number(0);
        }
        return true;
    }
}


///This function will check the roof data before set up flag.
/// Update text box will be done in update function.
function validate_roof_data_only() {
    var valid = false;
    // rectangle:
    if (Math.abs(roof.eave - roof.ridge) < 1) {
        if ((roof.left_offset < 1) && (roof.right_offset < 1)) {
            valid = true;
        }
        else {
            valid = false; 
        }
        return valid;
    }
    // Not rectangle: 
    var sum = roof.left_offset + roof.right_offset;
    if (roof.eave > roof.ridge) {
        var diff = roof.eave - roof.ridge - sum;
    }
    else {
        var diff = roof.ridge - roof.eave - sum;
    }
    if (diff < 0) {
        alert("Offset is too large!!");
        return;
    }
    if (Math.abs(diff) > 1) {
        valid = false;
    }
    else {
        valid = true;
    }
    return valid; 
}

 
/// read data and check if the condition of eave + left_offset + right_offse = ridge (if eave < ridge)
function read() {
    var v = false;
    read_data_status.left_offset = false;
    read_data_status.right_offset = false;
    while (v == false) {
        read_data();
        v = validate_and_update_data();
        //v = validate_roof_data_only();
    }

    g_data_is_valid = v; 
    read_data_status.left_offset = true;
    read_data_status.right_offset = true;

    console.log("roof info update:   ");
    console.log("read data as " + roof.eave + "   " +  roof.ridge);
    // console.log("read data as " + roof.left_side + "   " +  roof.right_side);
    console.log("left_offset : " +  roof.left_offset + " right_offset: " +  roof.right_offset);
    console.log("height measured " +  roof.height_measured + " angle:  " +  roof.angle);
}
