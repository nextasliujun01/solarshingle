/// Copyright(C) 2023 - 2033 Solarshingle Canada - All Rights Reserved
/// Use original symmetric + invert and normal Trapezoidal
/// This file contains functions for processing 2 layer roof. 
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
var g_left_ref_line = false; // the vertical line on the left or right side.
var g_use_ref_line = false;
var g_invert_eave_short = false; 
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

var cv_real_lower_height = 1;
var cv_real_upper_height = 1;
var cv_real_lower_left_side = 1;
var cv_real_lower_right_side = 1;
var cv_real_upper_left_side = 1;
var cv_real_upper_right_side = 1;
var cv_lower_rows = 0;
var cv_upper_rows = 0; //
var cv_lower_left_gap_x = 0;
var cv_lower_right_gap_x = 0;
var cv_upper_left_gap_x = 0;
var cv_upper_right_gap_x = 0;


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

/// 
const two_layers_roof = {
    lower_btm: 880,
    lower_top: 600,
    lower_left_offset: 40,
    lower_right_offset: 40,
    lower_height: 100,
    dislocation: 30, // only one side 
    upper_btm: 180,
    upper_top: 400,
    upper_left_offset: 40,
    upper_right_offset: 40,
    upper_height: 150,
    angle: 0
}


/// For keep tracking left/right offset input textbox.
const read_data_status = {
    left_offset: false,
    right_offset: false
}


// Define array of 4 corners. Need to update values in array. 
var four_corners = [[0, 1], [2, 3], [4, 5], [6, 7]]; // left-bottom, left-top, right-top, right-bottom. 
var eight_corners = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 1], [2, 3], [4, 5], [6, 7]]; // for two layer case
var four_ss_corners = [];


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
/// For normal trapezoidal shape, two layer roof.
/// From y value to find ss per row by using triangle.
/// The ss_per_row is calculated based on the row above the current row.
/// This method is used to ensure SS of the current row can be covered by metal covers.
function find_normal_ss_per_row_new(start_y, row, y1, y2, lower) {
    var left_offset = 0;
    var right_offset = 0;
    var real_height = 0;
    var left_gap = 0;
    var right_gap = 0;
    var roof_width = 0;
  
    if (lower) {
        left_offset = two_layers_roof.lower_left_offset;
        right_offset = two_layers_roof.lower_right_offset;
        real_height = cv_real_lower_height;
        left_gap = cv_lower_left_gap_x;
        right_gap = cv_lower_right_gap_x;
        roof_width = two_layers_roof.lower_btm;
    }
    else {
        left_offset = two_layers_roof.upper_left_offset;
        right_offset = two_layers_roof.upper_right_offset;
        real_height = cv_real_upper_height;
        left_gap = cv_upper_left_gap_x;
        right_gap = cv_upper_right_gap_x;
        roof_width = two_layers_roof.upper_btm;
        console.log("roof width for upper layer " + roof_width);
    }
    //var y1 = Math.floor(start_y + row * ss_height); // bottom of SS (level N + 1) in document.
    //var y2 = Math.floor(start_y + (row + 1) * ss_height); // top of SS (level N + 1)
    var next_top = Math.floor(start_y + (row + 1) * ss_height + ss_height); // top of next level (level N+2).
    //var row_next = row + 1;

    // current no of SS and row_width
    
    var row_width_current = find_width_of_SS_new(left_offset, right_offset, real_height, left_gap, right_gap, roof_width, y2);
    console.log(" *** row width " + row_width_current);
    console.log(" *** real height " + real_height); 
    console.log(" *** gap " + left_gap + "  " + right_gap);
    var ss_per_row_current = Math.floor(row_width_current / ss_width);

    // no of ss on row_n2. 
    var row_width_next = find_width_of_SS_new(left_offset, right_offset, real_height, left_gap, right_gap, roof_width, next_top);
    var ss_per_row_next = Math.floor(row_width_next / ss_width);
    console.log("2 width   " + row_width_current + ",  " + row_width_next);
    console.log("current ss and next ss " + ss_per_row_current + " ,  " + ss_per_row_next);
    var ss_per_row = ss_per_row_next;
    return ss_per_row; 
}

 
///Fill four_ss_corners in a row. 
function get_ss_per_row(ss_per_row, ss_width, start_x, y1, y2) {
    console.log("start x " + start_x + "  ")
    for (let col = 0; col < ss_per_row; col++) {
        var left = Math.floor(col * ss_width + start_x);
        //console.log("Left " + left);
        var right = Math.floor(left + ss_width);
        //console.log("y1 " + y1);
        four_ss_corners.push(left, y1, left, y2, right, y2, right, y1);
     
    }
    var length = four_ss_corners.length;
    console.log("four corners length " + length);
    console.log("last one " + four_ss_corners[length - 2] + "  " + four_ss_corners[length - 1]);
}


/// For joint lower and upper layers together
function process_joint_part_normal() {
    var start_y = eave_ss_offset + cv_lower_rows * ss_height;
    console.log("start_y after lower layer " + start_y);
    console.log("upper height" + cv_real_upper_height);
    // check number of rows of ss can be put.
    var r = ((cv_real_lower_height + cv_real_upper_height - ridge_ss_offset) - start_y) / ss_height;
    console.log("estimated rows " + r);
    console.log("rows from upper layer " + cv_upper_rows);
    var diff = cv_real_lower_height - start_y;
    var add = true;
    var num = 0;
    while (add) {
        if ((start_y + num * ss_height) > cv_real_lower_height) {
            add = false;
        }
        else {
            num = num + 1;
        }
    }
    // num is the number of rows between lower and upper layers. 
    var y1 = Math.floor(start_y + (num ) * ss_height - cv_real_lower_height); // this is the y value from the bottom of upper layer.
    var y2 = Math.floor(start_y + (num + 1) * ss_height - cv_real_lower_height); // this is the y value from the bottom of upper layer.
   
    // Use joint_y to find width for ss. 
    console.log("y1 & y2 " + y1 + "   " + y2);
    // call find_width_of_SS_new() to get the row width
    var row_width_next = find_width_of_SS_new(two_layers_roof.upper_left_offset, two_layers_roof.upper_right_offset,
        cv_real_upper_height, cv_upper_left_gap_x, cv_upper_right_gap_x, two_layers_roof.upper_btm, y2);
    var ss_per_row_next = Math.floor(row_width_next / ss_width);
    console.log(" >>>> Next row width   "  + row_width_next + "  num of ss  " + ss_per_row_next);
   
    var ss_per_row = ss_per_row_next;
    var ss_length = ss_per_row * ss_width;
    var start_x = Math.floor(two_layers_roof.lower_left_offset + two_layers_roof.dislocation + (two_layers_roof.upper_btm - ss_length) / 2);
    
    for (var row = 0; row < num; row++) {
        y2 = start_y + (row + 1) * ss_height;
        get_ss_per_row(ss_per_row, ss_width, start_x, start_y, y2);
    }
    //console.log("start x " + start_x);
    
    return num; // return the number of rows between upper and lower layer. 
}


/// For normal trapezoidal case
function find_normal_2_layer_ss(two_layers_roof) {
    // 
    if (g_normal_trapezoidal) {
        var lower_layer = true;
        var start_y = eave_ss_offset;
        console.log("find_normal_ss");
        // Process rows in lower layer first: 
        for (let row = 0; row < cv_lower_rows; row++) {
            console.log("Row == " + row);
            var y1 = Math.floor(start_y + row * ss_height); // bottom of SS (level N + 1) in document.
            var y2 = Math.floor(start_y + row * ss_height + ss_height); // top of SS (level N + 1)
            var ss_per_row_next = find_normal_ss_per_row_new( start_y, row, y1, y2, lower_layer); // 
 
            var ss_per_row = ss_per_row_next;

            // Use ss_per_row to find ss_length. 
            var ss_length = ss_per_row * ss_width;
            var start_x = Math.floor((two_layers_roof.lower_btm - ss_length) / 2);
            //console.log("start x " + start_x);
            get_ss_per_row(ss_per_row, ss_width, start_x, y1, y2);
            if (row == 0) {
                cv_max_ss_in_row = ss_per_row;
            }
        }
        // Process rows in upper layer of roof.
        var joint_row = process_joint_part_normal();
        console.log("Lower layer has row " + cv_lower_rows);
        console.log("**************************");
        console.log("Upper layer has row " + cv_upper_rows);

        console.log("joint rows " + joint_row);
        var global_y = (cv_lower_rows + joint_row) * ss_height + eave_ss_offset;
        var upper_start_y = global_y - cv_real_lower_height;
        var rows = Math.floor((cv_real_upper_height - upper_start_y - ridge_ss_offset) / ss_height);
        for (let row = 0; row < rows; row++) {
            var t = row + joint_row + cv_lower_rows;
            console.log("Row == " + t);
            var y1 = Math.floor(upper_start_y + row * ss_height); // bottom of SS (level N + 1) in document.
            var y2 = Math.floor(upper_start_y + row * ss_height + ss_height); // top of SS (level N + 1)
            lower_layer = false;

            var ss_per_row_next = find_normal_ss_per_row_new(upper_start_y, row, y1, y2, lower_layer); // 

            var ss_per_row = ss_per_row_next;
        
            // Use ss_per_row to find ss_length. 
            var ss_length = ss_per_row * ss_width;
            var start_x = Math.floor(two_layers_roof.lower_left_offset + two_layers_roof.dislocation + (two_layers_roof.upper_btm - ss_length) / 2);
            //console.log("start x " + start_x);
            var g_y1 = y1 + cv_real_lower_height;
            var g_y2 = y2 + cv_real_lower_height;
            get_ss_per_row(ss_per_row, ss_width, start_x, g_y1, g_y2);
           
        }
    }
    else {
        console.log("No code here ...");
    }
}


/// From smaller lower layer to larger upper layer. 
/// Use the number of ss and starting x position for the joint part.
/// Need to know the number of rows between lower and upper layers. 
function process_joint_part_invert(ss_in_top_row, start_x_in_top_row) {
    var start_y = eave_ss_offset + cv_lower_rows * ss_height;
    console.log("start_y after lower layer " + start_y);
    console.log("upper height" + cv_real_upper_height);
    // check number of rows of ss can be put.
    var r = ((cv_real_lower_height + cv_real_upper_height - ridge_ss_offset) - start_y) / ss_height;
    console.log("estimated rows " + r);
    console.log("rows from upper layer " + cv_upper_rows);

    var add = true;
    var num = 0;
    while (add) {
        if ((start_y + num * ss_height) > (cv_real_lower_height + eave_ss_offset)) { // joint ss must exceed 2" offset 
            add = false;
        }
        else {
            num = num + 1;
        }
    }
    // num is the number of rows between lower and upper layers. 
    var y1 = Math.floor(start_y + (num) * ss_height - cv_real_lower_height); // this is the y value of num rows from upper_btm.
    var y2 = Math.floor(start_y + (num + 1) * ss_height - cv_real_lower_height); // this is the y value of (num+1)rows from upper_btm.

    // Use joint_y to find width for ss. 
    console.log("y1 & y2 " + y1 + "   " + y2);
    // call find_width_of_SS_new() to get the row width
    var row_width_next = find_width_of_SS_new(two_layers_roof.upper_left_offset, two_layers_roof.upper_right_offset,
        cv_real_upper_height, cv_upper_left_gap_x, cv_upper_right_gap_x, two_layers_roof.upper_btm, y2);
    var ss_per_row_next = Math.floor(row_width_next / ss_width);
    console.log(" >>>> Next row width   " + row_width_next + "  num of ss  " + ss_per_row_next);

    var ss_per_row = ss_in_top_row;
    
    var start_x = start_x_in_top_row; 

    for (var row = 0; row < num; row++) {
        y2 = start_y + (row + 1) * ss_height; // y of the top of ss.
        get_ss_per_row(ss_per_row, ss_width, start_x, start_y, y2);
    }
    //console.log("start x " + start_x);

    return num; // return the number of rows between upper and lower layer. 
}


/// This function will process 2 layer roof with eave shorter than ridge.
function find_invert_2_layer_ss(two_layers_roof) {
    // 
    var lower_layer = true;
    var start_y = cv_invert_start_y;
    var top_row_start_x = 0;
    var top_row_ss = 0; 
    console.log("find_invert_2_layer() ");
    console.log("Start y is " + start_y);
    // Process rows in lower layer first: 
    for (let row = 0; row < cv_lower_rows; row++) {
        start_y = cv_invert_start_y;
        // Process rows: 
        var y1 = Math.floor(start_y + row * ss_height); // use this y1.
        var y2 = Math.floor(start_y + row * ss_height + ss_height);

        // at y=y1, check the width of SS area. x/h = offset/real_height;
        var row_width = find_width_of_SS_new(two_layers_roof.lower_left_offset, two_layers_roof.lower_right_offset, cv_real_lower_height,
            cv_lower_left_gap_x, cv_lower_right_gap_x, two_layers_roof.lower_top, y1);
        console.log("row length is " + row_width);
        if (row_width <= 0) {
            console.log("A problem in code, row_width cannot be negative! ");
            return -1;
        }
        var ss_per_row = Math.floor(row_width / ss_width);

        // total ss length
        var ss_length = ss_per_row * ss_width;
        var start_x = Math.floor(two_layers_roof.upper_left_offset + two_layers_roof.dislocation + (two_layers_roof.lower_top - ss_length) / 2);
        get_ss_per_row(ss_per_row, ss_width, start_x, y1, y2);
        console.log("Current coodinate " + four_ss_corners.length);
      
        if (row == (cv_lower_rows - 1)) {
            top_row_start_x = start_x;
            top_row_ss =   ss_per_row;
        }
    }
    // Process rows in upper layer of roof.
    var joint_row = process_joint_part_invert(top_row_ss, top_row_start_x);
    console.log("Lower layer has row " + cv_lower_rows);
    console.log("**************************");
    console.log("Upper layer has row " + cv_upper_rows);
    process_joint_part_invert
    console.log("joint rows " + joint_row);
    var global_y = (cv_lower_rows + joint_row) * ss_height + cv_invert_start_y; // cv_invert_start_y maybe more than eave_ss_offset!!
    var upper_start_y = global_y - cv_real_lower_height;

    var rows = Math.floor((cv_real_upper_height - upper_start_y - ridge_ss_offset) / ss_height);
    for (let row = 0; row < rows; row++) {
        var t = row + joint_row + cv_lower_rows;
        console.log("Row == " + t);
        var y1 = Math.floor(upper_start_y + row * ss_height); // bottom of SS (level N + 1) in document.
        var y2 = Math.floor(upper_start_y + row * ss_height + ss_height); // top of SS (level N + 1)
        lower_layer = false;
        var row_width = find_width_of_SS_new(two_layers_roof.upper_left_offset, two_layers_roof.upper_right_offset, cv_real_upper_height,
            cv_upper_left_gap_x, cv_upper_right_gap_x, two_layers_roof.upper_top, y1);
         
        console.log("row length is " + row_width);
        if (row_width <= 0) {
            console.log("A problem in code, row_width cannot be negative! ");
            return -1;
        }
        var ss_per_row = Math.floor(row_width / ss_width);
        
        // Use ss_per_row to find ss_length. 
        var ss_length = ss_per_row * ss_width;
        var start_x = Math.floor((two_layers_roof.upper_top - ss_length) / 2);
        //console.log("start x " + start_x);
        var g_y1 = y1 + cv_real_lower_height;
        var g_y2 = y2 + cv_real_lower_height; 
        get_ss_per_row(ss_per_row, ss_width, start_x, g_y1, g_y2);
        if (row == (rows - 1)) {
            cv_max_ss_in_row = ss_per_row; 
        }
    }


    cv_total_rows = cv_lower_rows + joint_row + rows;
}


/// For testing (Try it) button
function test_case5() {
    if (g_data_is_valid == false) {
        alert("Data is not valid.. stop");
        return;
    }
    
    if (four_ss_corners.length > 0) {
        four_ss_corners.length = 0;
        console.log("four_ss_corners : " + four_ss_corners.length);
    }
    var symm = true;
    // symm = check_symmetric(two_layers_roof);
    console.log("Symmetric check:  " + symm);
    g_symmetric = symm;
    //var rect = check_rectangle(roof);
    //console.log("Rectangle " + rect);
    //g_rectangle = rect;
    cv_real_lower_height = find_real_height(two_layers_roof.angle, two_layers_roof.lower_height);
    cv_real_upper_height = find_real_height(two_layers_roof.angle, two_layers_roof.upper_height);
    console.log("real lower height " + cv_real_lower_height);
    console.log("real upper height " + cv_real_upper_height);
    var total_rows = find_total_rows(cv_real_lower_height + cv_real_upper_height, eave_ss_offset, ridge_ss_offset);
    console.log("Total rows  " + total_rows);
    cv_total_rows = total_rows;
    cv_lower_rows = find_total_rows(cv_real_lower_height, eave_ss_offset, ridge_ss_offset);
    cv_upper_rows = find_total_rows(cv_real_upper_height, eave_ss_offset, ridge_ss_offset);

    find_real_side_length_2_layers(cv_real_lower_height, cv_real_upper_height, two_layers_roof);

    console.log("Real lower_left side length ", cv_real_lower_left_side);
    console.log("Real upper_right side length ", cv_real_upper_right_side);
    find_corner_coord_two_layers(two_layers_roof, cv_real_lower_height, cv_real_upper_height);
    console.log("Coordinates " + eight_corners);
    console.log("normal or invert shape " + g_normal_trapezoidal);
    find_gaps_two_layer();
   

    // For invert trapezoidal, check the length of eave and set g_invert_eave_short
    if (g_normal_trapezoidal == false) {
        cv_invert_start_y = eave_ss_offset;
        console.log("Check invert y offset ")
        var t1 = two_layers_roof.lower_btm - cv_left_gap_x - cv_right_gap_x - ss_width;
        if (t1 < 0) {
            g_invert_eave_short = true;
        }
        else {
            g_invert_eave_short = false; 
        }
        
        if (g_invert_eave_short) {
            cv_invert_start_y = first_y_for_invert(two_layers_roof.lower_top, two_layers_roof.lower_left_offset,
                two_layers_roof.lower_right_offset, cv_lower_left_gap_x, cv_lower_right_gap_x) + 1;
            console.log("Invert start y " + cv_invert_start_y);
            if (cv_invert_start_y < eave_ss_offset) {
                cv_invert_start_y = eave_ss_offset;
            }
            // re-calculate rows
            var total_height = cv_real_lower_height + cv_real_upper_height;
            cv_total_rows = find_total_rows(total_height, cv_invert_start_y, ridge_ss_offset);
        }
    }

    console.log("Reference line at  " + cv_ref_line_x);
    //
    console.log("gaps in x-direction: L and R " + cv_left_gap_x + "    " + cv_right_gap_x);
    if (g_normal_trapezoidal) {
        find_normal_2_layer_ss(two_layers_roof);
    }
    else {
        find_invert_2_layer_ss(two_layers_roof);
    }
   
    find_linear_inch();
}


//////// Utility functions
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
function first_y_for_invert(ridge, left_offset, right_offset, left_gap, right_gap) {
    console.log("in first y ");
    var t1 = ridge - left_gap - right_gap - ss_width;
    var t2 = left_offset / right_offset + 1;
    var r2 = t1 / t2;
    // use r2 to find y. Relationship: H/Roff = (H-y) / R2
    var y = cv_real_height * (1 - r2 / right_offset); // r2 < right_offset! 
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
            //console.log("y = " + y + " x_left " + x_left + "x_right " + x_right);
            //console.log("cv_left_gap_x and cv_right_gap_x " + cv_left_gap_x + "  " + cv_right_gap_x);
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


/// Based on the y value, find the distance between two sides of area for SS. 
function find_width_of_SS_new(left_offset, right_offset, real_height, left_gap, right_gap, roof_width, y) {
    if (g_rectangle) {
        console.log("Wrong function, no need to get width for SS since roof is rectangle... ");
        return -1;
    }
    var width_ss_row = 0;
    if (g_symmetric) {
        if (g_normal_trapezoidal) {
            // the x-offset given y outside of traperoidal.  // y increase, x also increases
            var x_left = left_offset * y / real_height;
            var x_right = right_offset * y / real_height;
            width_ss_row = roof_width - x_left - x_right - left_gap - right_gap;
        }
        else {
            var x_left = left_offset * (real_height - y) / real_height;
            var x_right = right_offset * (real_height - y) / real_height;
            width_ss_row = roof_width - x_left - x_right - left_gap - right_gap;
            console.log("y = " + y + " x_left " + x_left + "x_right " + x_right);
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

 

function find_corner_coord_two_layers(two_layers_roof, cv_real_lower_height, cv_real_upper_height) {
    if (two_layers_roof.lower_btm > two_layers_roof.lower_top) {
        g_normal_trapezoidal = true;
        eight_corners[0][0] = 0;
        eight_corners[0][1] = 0;
        eight_corners[1][0] = two_layers_roof.lower_left_offset;
        eight_corners[1][1] = cv_real_lower_height;
        eight_corners[2][0] = two_layers_roof.lower_left_offset + two_layers_roof.dislocation;
        eight_corners[2][1] = cv_real_lower_height;
        eight_corners[3][0] = two_layers_roof.lower_left_offset + two_layers_roof.dislocation + two_layers_roof.upper_left_offset;
        eight_corners[3][1] = cv_real_lower_height + cv_real_upper_height;
        // on right side of roof:
        eight_corners[4][0] = two_layers_roof.lower_left_offset + two_layers_roof.dislocation + two_layers_roof.upper_left_offset + two_layers_roof.upper_top;
        eight_corners[4][1] = cv_real_lower_height + cv_real_upper_height;
        eight_corners[5][0] = two_layers_roof.lower_left_offset + two_layers_roof.dislocation + two_layers_roof.upper_btm;
        eight_corners[5][1] = cv_real_lower_height;
        eight_corners[6][0] = two_layers_roof.lower_left_offset + two_layers_roof.lower_top;
        eight_corners[6][1] = cv_real_lower_height;
        eight_corners[7][0] = two_layers_roof.lower_btm;
        eight_corners[7][1] = 0;

    }
    else {
        g_normal_trapezoidal = false;
        eight_corners[0][0] = two_layers_roof.upper_left_offset + two_layers_roof.dislocation + two_layers_roof.lower_left_offset;
        eight_corners[0][1] = 0;
        eight_corners[1][0] = two_layers_roof.upper_left_offset + two_layers_roof.dislocation;
        eight_corners[1][1] = cv_real_lower_height;
        eight_corners[2][0] = two_layers_roof.upper_left_offset ;
        eight_corners[2][1] = cv_real_lower_height;
        eight_corners[3][0] = 0;
        eight_corners[3][1] = cv_real_lower_height + cv_real_upper_height;
        // on right side of roof:
        eight_corners[4][0] = two_layers_roof.upper_top;
        eight_corners[4][1] = cv_real_lower_height + cv_real_upper_height;
        eight_corners[5][0] = two_layers_roof.upper_top - two_layers_roof.upper_right_offset;
        eight_corners[5][1] = cv_real_lower_height;
        eight_corners[6][0] = two_layers_roof.upper_left_offset + two_layers_roof.dislocation + two_layers_roof.lower_top;
        eight_corners[6][1] = cv_real_lower_height;
        eight_corners[7][0] = two_layers_roof.upper_left_offset + two_layers_roof.dislocation + two_layers_roof.lower_left_offset + two_layers_roof.lower_btm;
        eight_corners[7][1] = 0;


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

/// Because 2 layers may come with different offsets, the gap in x direction will be different. 
function find_gaps_two_layer() {
    // Find x-distance given the distance between roof edge and SS area (i.e. gap btw two parallel lines):
    // Two triangles share the same angle (lower left corner), hence: 
    cv_lower_left_gap_x = cv_real_lower_left_side * left_right_ss_offset / cv_real_lower_height;
    cv_lower_right_gap_x = cv_real_lower_right_side * left_right_ss_offset / cv_real_lower_height;
    cv_upper_left_gap_x = cv_real_upper_left_side * left_right_ss_offset / cv_real_upper_height;
    cv_upper_right_gap_x = cv_real_upper_right_side * left_right_ss_offset / cv_real_upper_height;
}


///TODO: merge these two functions
/// Use height (distance between eave and ridge)
function find_total_rows(sb_height, bottom_offset, top_offset) { 
    var total_height = (sb_height - bottom_offset - top_offset) / ss_height;
    var total_rows = Math.floor(total_height);
    return total_rows;
}

 
/// Use the length of the left and right side to determine if roof is symmetric.
/// Use left-offset and right-offset is also possible.
function check_symmetric(roof) {
    var symmetric = false;
      
    if (Math.abs(roof.lower_left_offset - roof.lower_right_offset) < side_diff) {
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
    cv_real_left_side = actual_height;
    cv_real_right_side = actual_height;
    if (roof.left_offset > 0) {
        var t = Math.sqrt(roof.left_offset * roof.left_offset + actual_height * actual_height);
        cv_real_left_side = Math.floor(t);
    }
    if (roof.right_offset > 0) {
        var t = Math.sqrt(roof.right_offset * roof.right_offset + actual_height * actual_height);
        cv_real_right_side = Math.floor(t);
    }
}


/// Use side_offset and actual height to get real_side_length.
function find_real_side_length_2_layers(lower_real_height, upper_real_height, two_layers_roof) {
    cv_real_lower_left_side = lower_real_height;
    cv_real_lower_right_side = lower_real_height;
    cv_real_upper_left_side = upper_real_height;
    cv_real_upper_right_side = upper_real_height;
    if (two_layers_roof.lower_left_offset > 0) {
        var t = Math.sqrt(two_layers_roof.lower_left_offset * two_layers_roof.lower_left_offset + lower_real_height * lower_real_height);
        cv_real_lower_left_side = Math.floor(t);
    }
    if (two_layers_roof.lower_right_offset > 0) {
        var t = Math.sqrt(two_layers_roof.lower_right_offset * two_layers_roof.lower_right_offset + lower_real_height * lower_real_height);
        cv_real_lower_right_side = Math.floor(t);
    }
    if (two_layers_roof.upper_left_offset) {
        var t = Math.sqrt(two_layers_roof.upper_left_offset * two_layers_roof.upper_left_offset + upper_real_height * upper_real_height);
        cv_real_upper_left_side = Math.floor(t);
    }
    if (two_layers_roof.upper_right_offset > 0) {
        var t = Math.sqrt(two_layers_roof.upper_right_offset * two_layers_roof.upper_right_offset + upper_real_height * upper_real_height);
        cv_real_upper_right_side = Math.floor(t);
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
        drawLine(ctx, [cv_ref_line_x, drawing_offset], [cv_ref_line_x, cv_real_height + drawing_offset], 'red', 2);
        
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
    }
}


//// Draw() function 
function draw_case5() {

    const canvas = document.querySelector('#canvas');
    if (canvas.getContext) {

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var y_upper = cv_real_upper_height + cv_real_lower_height + drawing_offset;

        console.log("height " + canvas.height);
        console.log("y_upper " + y_upper);
        //drawLine(ctx, [100, 100], [100, 300], 'green', 5);
        var points = 8;
        for (let i = 0; i < points; i++) {
            drawLine(ctx, [eight_corners[i][0], y_upper - eight_corners[i][1]], [eight_corners[(i + 1) % points][0], y_upper - eight_corners[(i + 1) % points][1]], 'green', 3);
        }
        drawLine(ctx, [cv_ref_line_x, drawing_offset], [cv_ref_line_x, cv_real_height + drawing_offset], 'red', 2);

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

    var lower_btm = document.getElementById('lower_btm').value;
    var lower_top = document.getElementById('lower_top').value;
     
    var lower_left_offset = document.getElementById('lower_left_off').value;
    var lower_right_offset = document.getElementById('lower_right_off').value;

    var lower_height = document.getElementById('lower_height').value;

    var dislocation = document.getElementById('dislocation').value;

    var upper_btm = document.getElementById('upper_btm').value;
    var upper_top = document.getElementById('upper_top').value;

    var upper_left_offset = document.getElementById('upper_left_off').value;
    var upper_right_offset = document.getElementById('upper_right_off').value;

    var upper_height = document.getElementById('upper_height').value;

    var angle = document.getElementById('angle').value;


    //console.log("read data as " + eave + "   " + ridge);
    ////console.log("read data as " + left_side + "   " + right_side);
    //console.log("left_offset : " + left_offset + " right_offset: " + right_offset);
    //console.log("height measured " + height_measured + " angle:  " + angle);

    if (check_input(lower_btm) == false) {
        return;
    }
    if (check_input(lower_top) == false) {
        return;
    }
   
    if (check_input(lower_left_offset) == false) {
        return;
    }
    if (check_input(lower_right_offset) == false) {
        return;
    }
    if (check_input(lower_height) == false) {
        return;
    }

    if (check_input(dislocation) == false) {
        return;
    }
    if (check_input(upper_btm) == false) {
        return;
    }
    if (check_input(upper_top) == false) {
        return;
    }

    if (check_input(upper_left_offset) == false) {
        return;
    }
    if (check_input(upper_right_offset) == false) {
        return;
    }
    if (check_input(upper_height) == false) {
        return;
    }

    if (check_input(angle) == false) {
        return;
    }

    two_layers_roof.lower_btm = Number(lower_btm);
    two_layers_roof.lower_top = Number(lower_top);

    if (lower_left_offset == "") {
        status_left_offset = false;
        console.log("lower_left_offset is null ");
    }
    else {
        status_left_offset = true;
        console.log("lower_left_offset has value ");
    }
    
    if (lower_right_offset == "") {
        status_right_offset = false;
        console.log("lower_right_offset is null ");
    }
    else {
        status_right_offset = true;
        console.log("lower_right_offset has value ");
    }

    two_layers_roof.lower_left_offset = Number(lower_left_offset);
    two_layers_roof.lower_right_offset = Number(lower_right_offset);
    two_layers_roof.lower_left_offset = Number(lower_left_offset);
    two_layers_roof.lower_right_offset = Number(lower_right_offset);
    two_layers_roof.lower_height = Number(lower_height);
    // The dislocation is the difference between top_layer and bottom layer. Assume it is symmetric
    // Hence, only use the difference to get the value. User will not enter it.
    //two_layers_roof.dislocation = Number(dislocation);

    two_layers_roof.upper_btm = Number(upper_btm);
    two_layers_roof.upper_top = Number(upper_top);
    two_layers_roof.upper_left_offset = Number(upper_left_offset);
    two_layers_roof.upper_right_offset = Number(upper_right_offset);
    two_layers_roof.upper_height = Number(upper_height);

    two_layers_roof.angle = Number(angle);

    var diff =  Math.abs(two_layers_roof.upper_btm - two_layers_roof.lower_top) / 2;
    two_layers_roof.dislocation = Math.floor(diff);
    document.getElementById('dislocation').value = two_layers_roof.dislocation;


    console.log("roof info ---- ");
    console.log(two_layers_roof);
    if ((status_left_offset == false) && (status_right_offset == false) ) {
        alert("You need to enter at least one of left_offset or right_offset...! ");
    }
    read_data_status.left_offset = status_left_offset;
    read_data_status.right_offset = status_right_offset;
}


///
function validate_and_update_data() {
    if (Math.abs(roof.eave - roof.ridge) < 1) {
        if ((read_data_status.left_offset == false) || (read_data_status.right_offset == false)) {
            let value = prompt("For rectangle, set offsets to 0", 0);
            document.getElementById("left_offset").value = Number(value);
            document.getElementById("right_offset").value = Number(value);
        }
        return;
    }

    var sum = roof.left_offset + roof.right_offset;
    var diff = 0;
    if (roof.eave > roof.ridge) {
        diff = roof.eave - roof.ridge;
    }
    else if (roof.eave < roof.ridge) {
        diff = roof.ridge - roof.eave;
        normal_shape = false;
    }
    var diff_offset = diff - sum;
    if (diff_offset < 0) {
        alert("Enter correct left and right offset. Sum of offsets is too large! Set to 0!");
        document.getElementById("left_offset").value = Number(0);
        document.getElementById("right_offset").value = Number(0);
        roof.left_offset = Number(0);
        roof.right_offset = Number(0);
        return;
    }
    if (Math.abs(diff_offset) > 1) {
        console.log("In validate (), " + read_data_status.left_offset + " ,  " + read_data_status.right_offset); 
        if (read_data_status.left_offset) {
            var temp = diff - roof.left_offset;
            let value = prompt("To ensure left and right offset are correct, enter right offset value ", temp);
            if (value == null || value == "") {
                text = "User cancelled the prompt";
            }
            else {
                text = "User enter value";
                document.getElementById("right_offset").value = Number(value);
                // update right_offset value!!!
                roof.right_offset = Number(value);
            }
        }
        else if (read_data_status.right_offset) { // right offset is set.
            var temp = diff - roof.right_offset;
            let value = prompt("To ensure left and right offset are correct, enter left offset value ", temp);
            if (value == null || value == "") {
                text = "User cancelled the prompt";
            }
            else {
                text = "User enter value";
                document.getElementById("left_offset").value = Number(value);
                // update left_offset value!!!
                roof.left_offset = Number(value);
            }
        }
        else {
            console.log("validate_and_udapte_data() both offsets are not set ");
            var temp = diff;
            let value = prompt("Program set left offset value as ", temp);
            if (value == null || value == "") {
                text = "User cancelled the prompt";
            }
            else {
                text = "User enter value";
                document.getElementById("left_offset").value = Number(value);
                document.getElementById("right_offset").value = Number(0);
                
                // update right_offset value!!!
                roof.left_offset = Number(value);
                roof.right_offset = Number(0);
            }

        }
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


/// Need to make sure the length between two layers are correct.
/// If not, return false, and alert.
function validate_two_layer_data() {
    // check upper_btm & lower_top first
    if (two_layers_roof.upper_btm < two_layers_roof.lower_top) {
        var upper = two_layers_roof.upper_btm + 2 * two_layers_roof.dislocation;
        if (Math.abs(upper - two_layers_roof.lower_top) > 5) {
            alert("You need to modify the values in either upper or lower layer to match the length...! ");
            return false;
        }
    }
    else {
        var upper = two_layers_roof.lower_top + 2 * two_layers_roof.dislocation;
     
        if (Math.abs(upper - two_layers_roof.upper_btm) > 5) {
            alert("You need to modify the values in either upper or lower layer to match the length...! ");
            return false; 
        }
    }
    return true; 
}


/// read data and check if the condition of eave + left_offset + right_offse = ridge (if eave < ridge)
function read() {
    var v = false;
    read_data_status.left_offset = false;
    read_data_status.right_offset = false;
    
    read_data();
    //validate_and_update_data();
    //v = validate_roof_data_only();'
    v = validate_two_layer_data(); // skip validation for now...

    if (v == false) {
        alert("You need to enter correct value for the bottom of upper layer or the top of the lower layer !");
        return; 
    }

    g_data_is_valid = v; 
    read_data_status.left_offset = true;
    read_data_status.right_offset = true;

    console.log("roof info update:   ");
    console.log("read data as " + two_layers_roof.lower_btm + "   " + two_layers_roof.lower_top);
    console.log("Info of 2 layer roof" + two_layers_roof);
    //// console.log("read data as " + roof.left_side + "   " +  roof.right_side);
    //console.log("left_offset : " +  roof.left_offset + " right_offset: " +  roof.right_offset);
    //console.log("height measured " +  roof.height_measured + " angle:  " +  roof.angle);
}
