/*-----------------------------------------------------------------------------------*/
// Variable Declaration
/*-----------------------------------------------------------------------------------*/

// Common variables
var canvas, gl, program;
var posBuffer, colBuffer, texBuffer, vPosition, vColor, vTexCoord;
var modelViewMatrixLoc, projectionMatrixLoc, texCoordLoc;
var modelViewMatrix, projectionMatrix, texture;

// Variables referencing HTML elements
// theta = [x, y, z]
var subdivSlider, subdivText, iterSlider, iterText, startBtn, speedSlider, speedText;
var checkTex1,checkTex2,tex1,tex2;
var theta = [0, 0, 0], move = [0, 0, 0];
var subdivNum = 3, iterNum = 1, scaleNum = 1, speedNum = 1;
var iterTemp = 0, animSeq = 0, animFrame = 0, animFlag = false;

// Variables for the 3D Sierpinski gasket
var points = [], colors = [], textures = [];

// Vertices for the 3D Sierpinski gasket (X-axis, Y-axis, Z-axis, W)
// For 3D, you need to set the z-axis to create the perception of depth
var vertices = [
    vec4( 0.0000,  0.0000, -1.0000, 1.0000),
    vec4( 0.0000,  0.9428,  0.3333, 1.0000),
    vec4(-0.8165, -0.4714,  0.3333, 1.0000),
    vec4( 0.8165, -0.4714,  0.3333, 1.0000)
];

// Different colors for a tetrahedron (RGBA)
var baseColors = [
    vec4(1.0, 0.2, 0.4, 1.0),
    vec4(0.0, 0.9, 1.0, 1.0),
    vec4(0.2, 0.2, 0.5, 1.0),
    vec4(0.0, 0.0, 0.0, 1.0)
];

// Define texture coordinates for texture mapping onto a shape or surface
var texCoord = 
[
    vec2(0, 0), // Bottom-left corner of the texture
    vec2(0, 1), // Top-left corner of the texture
    vec2(1, 1), // Top-right corner of the texture
    vec2(1, 0)  // Bottom-right corner of the texture
];

/*-----------------------------------------------------------------------------------*/
// WebGL Utilities
/*-----------------------------------------------------------------------------------*/

// Execute the init() function when the web page has fully loaded
window.onload = function init()
{
    // Primitive (geometric shape) initialization
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);

    // WebGL setups
    getUIElement();
    configWebGL();
    configureTexture(tex1);
    render();
}

// Retrieve all elements from HTML and store in the corresponding variables
function getUIElement() {
    canvas = document.getElementById("gl-canvas");



    //Function to handle  subdivision radio buttons
    const subdivRadioButton = document.querySelectorAll('input[name="subdiv"]');
    function updateScene(subdivValue) {
        const numSubdivs = parseInt(subdivValue);
        subdivNum = numSubdivs;
        recompute();
    }
    subdivRadioButton.forEach(radioButton => {
        radioButton.addEventListener('change', () => {
            const selectedSubdiv = document.querySelector('input[name="subdiv"]:checked').value;
            updateScene(selectedSubdiv);
        });
    });

    const initialSubdiv = document.querySelector('input[name="subdiv"]:checked').value;
    updateScene(initialSubdiv);



    //Function to handle  iteration radio buttons
    const iterRadioButton = document.querySelectorAll('input[name="iter"]');
    function updateIterations(iterValue) {
      const numIterations = parseInt(iterValue); 
      iterNum = numIterations; // Update the iterNum variable
      // You might need to call a function here to update your animation logic
    }
    iterRadioButton.forEach(radioButton => {
      radioButton.addEventListener('change', () => {
        const selectedIter = document.querySelector('input[name="iter"]:checked').value;
        updateIterations(selectedIter);
      });
    });
    const initialIter = document.querySelector('input[name="iter"]:checked').value;
    updateIterations(initialIter);


    // Get the "Add Texture" checkbox
    textureToggle = document.getElementById("texture-toggle"); 

    // Add an event listener to the checkbox
    textureToggle.addEventListener('change', function() {
        if (this.checked) {
            configureTexture(tex2); // Apply texture when checked
        } else {
            configureTexture(tex1); // Remove texture when unchecked
        }
        recompute();
    });




    subdivSlider = document.getElementById("subdiv-slider");
    subdivText = document.getElementById("subdiv-text");
    iterSlider = document.getElementById("iter-slider");
    iterText = document.getElementById("iter-text");
    checkTex1 = document.getElementById("no-texture");
    checkTex2 = document.getElementById("texture-overlay");
    tex1 = document.getElementById("notexture");
	tex2 = document.getElementById("texture");
    speedDropdown = document.getElementById("speed-dropdown");
    speedText = document.getElementById("speed-text");
    startBtn = document.getElementById("start-btn");
    textureToggle = document.getElementById("texture-toggle");

    topLeftBottomRight = document.getElementById("top-left-bottom-right");
    topRightBottomLeft = document.getElementById("top-right-bottom-left");
    rotateXAxis = document.getElementById("rotate-x-axis");
    rotateYAxis = document.getElementById("rotate-y-axis");


    subdivisionPanel = document.getElementById("subdivision-panel");
	
    subdivSlider = function(event) 
	{
		subdivNum = event.target.value;
		subdivText.innerHTML = subdivNum;
        recompute();
    };

    iterSlider = function(event) 
	{
		iterNum = event.target.value;
		iterText.innerHTML = iterNum;
        recompute();
    };

    checkTex1 = function() 
	{
		if(checkTex1.checked)
        {
            configureTexture(tex1);
            recompute();
        }
    };

    checkTex2 = function() 
	{
		if(checkTex2.checked)
        {
            configureTexture(tex2);
            recompute();
        }
    };


    speedDropdown.onchange = function(event) {
        speedNum = parseFloat(event.target.value); // Parse the value as a float
        speedText.innerHTML = speedNum;
        recompute();
    };
    

    startBtn.onclick = function() {
        if (animFlag) { // Animation is running
            animFlag = false;
            startBtn.innerHTML = "Reset";
            window.cancelAnimationFrame(animFrame);
        } else { // Animation is stopped
            if (startBtn.innerHTML === "Reset") { // Reset state
                resetValue(); 
                configWebGL(); // Reconfigure WebGL to update the initial state
                render();     // Render the initial state
                startBtn.innerHTML = "Start"; 
            } else { // Start state
                animFlag = true;
                startBtn.innerHTML = "Stop";
                disableUI();
                animUpdate();
            }
        }
    };
}

// Configure WebGL Settings
function configWebGL()
{
    // Initialize the WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    
    if(!gl)
    {
        alert("WebGL isn't available");
    };

    // Set the viewport and clear the color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    // Compile the vertex and fragment shaders and link to WebGL
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create buffers and link them to the corresponding attribute variables in vertex and fragment shaders
    // Buffer for positions
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Buffer for colors
    colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Buffer for textures
    texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textures), gl.STATIC_DRAW);
    
    vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Get the location of the uniform variables within a compiled shader program
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    texCoordLoc = gl.getUniformLocation(program, "texture");
}

// Render the graphics for viewing
function render()
{
    // Cancel the animation frame before performing any graphic rendering
    if(animFlag)
    {
        animFlag = false;
        window.cancelAnimationFrame(animFrame);
    }
    
    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass a 4x4 projection matrix from JavaScript to the GPU for use in shader
    // ortho(left, right, bottom, top, near, far)
    projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
	gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Pass a 4x4 model view matrix from JavaScript to the GPU for use in shader
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

// Recompute points and colors, followed by reconfiguring WebGL for rendering
function recompute()
{
    // Reset points and colors for render update
    points = [];
	colors = [];
    textures = [];
    
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);
    configWebGL();
    render();
}

// Update the animation frame
function animUpdate()
{
    // Stop the animation frame and return upon completing all sequences
    if(iterTemp == iterNum)
    {
        window.cancelAnimationFrame(animFrame);
        enableUI();
        animFlag = false;
        return; // break the self-repeating loop
    }

    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the model view matrix for vertex transformation
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));

	// Handle new animations

	
    // Switch case to handle the ongoing animation sequence
    // The animation is executed sequentially from case 0 to case n
    switch(animSeq)
    {
        case 0: // Animation 1: Rotate the triangle 180 degrees to the right
            theta[2] -= speedNum;

            if(theta[2] <= -180)
            {
                theta[2] = -180;
                animSeq++;
            }

            break;

        case 1: // Animation 2: Rotate the triangle 180 degrees to the left
            theta[2] += speedNum;

            if(theta[2] >= 180)
            {
                theta[2] = 180;
                animSeq++;
            }

            break;


        case 2: // Animation 3: Rotate the triangle to original position
            theta[2] -= speedNum;

            if(theta[2] <= 0)
            {
                theta[2] = 0;
                animSeq++;
            }

            break;

        case 3: // Animation 4: Enlarge the triangle to an appropriate size
            scaleNum += 0.02 *speedNum;

            if(scaleNum >= 5)
            {
                scaleNum = 5;
                animSeq++;
            }
            break;

        case 4: // Animation 5: Shrink the triangle to the original size
            scaleNum -= 0.02 * speedNum;

            if(scaleNum <= 1)
            {
                scaleNum = 1;
                animSeq++;
            }
            break;

        //ROTATE ALONG X AXIS
        case 5: // Animation 6:  Rotate the triangle 180 degrees to the top
            if (rotateXAxis.checked) {

                theta[0] += speedNum;

                if(theta[0] >= 180)
                {
                    theta[0] = 180;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;

        case 6: // Animation 7: Rotate the triangle 180 degrees to the bottom
            if (rotateXAxis.checked) {
                theta[0] -= speedNum;

                if(theta[0] <= -180)
                {
                    theta[0] = -180;
                    animSeq++;
                }
            }
            
            else{
                animSeq++;
            }
            break;

        case 7: // Animation 8:  Rotate the triangle to the original position 

                theta[0] += 1 * speedNum;

                if(theta[0] >= 0)
                {
                    theta[0] = 0;
                    animSeq++;
                }
                break;

        //ROTATE ALONG Y AXIS
        case 8: // Animation 9: Rotate the triangle 180 degrees to the right
        if (rotateYAxis.checked) {  
                theta[1] -= 1 * speedNum;

                if(theta[1] <= -180)
                {
                    theta[1] = -180;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;

        case 9: // Animation 10: Rotate the triangle 180 degrees to the left
        if (rotateYAxis.checked) {
            theta[1] += 1 * speedNum;

            if(theta[1] >= 180)
            {
                theta[1] = 180;
                animSeq++;
            }
        }
        else{
            animSeq++;
        }
            break;

        case 10: // Animation 11: Rotate the triangle to the original position
            theta[1] -= 1 * speedNum;

            if(theta[1] <= 0)
            {
                theta[1] = 0;
                animSeq++;
            }
            break;

        case 11: // Animation 12: Move the triangle to the top right corner
            if (topRightBottomLeft.checked) {
                move[0] += 0.0125 * speedNum;
                move[1] += 0.005 * speedNum;

                if(move[0] >= 3.0 && move[1] >= 1.2)
                {
                    move[0] = 3.0;
                    move[1] = 1.2;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;

        case 12: // Animation 13: Move the triangle to the bottom left corner
            if (topRightBottomLeft.checked) {

                move[0] -= 0.0125 * speedNum;
                move[1] -= 0.005 * speedNum; 

                if(move[0] <= -3.0 && move[1] <= -1.2)
                {
                    move[0] = -3.0;
                    move[1] = -1.2;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;

        case 13: // Animation 14: Move the triangle to the original position

            move[0] += 0.0125 * speedNum;
            move[1] += 0.005 * speedNum;

            if(move[0] >= 0 && move[1] >= 0)
            {
                move[0] = 0;
                move[1] = 0;
                animSeq++;
            }
            break;
        
        case 14: // Animation 15: Move the triangle to the top left corner
            if (topLeftBottomRight.checked) {

                move[0] -= 0.0125 * speedNum;
                move[1] += 0.005 * speedNum;

                if(move[0] <= -3.0 && move[1] >= 1.2)
                {
                    move[0] = -3.0;
                    move[1] = 1.2;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;
        
        case 15: // Animation 16: Move the triangle to the bottom right corner
            if (topLeftBottomRight.checked) {  
            
                move[0] += 0.0125 * speedNum;
                move[1] -= 0.005 * speedNum;

                if(move[0] >= 3.0 && move[1] <= -1.2)
                {
                    move[0] = 3.0;
                    move[1] = -1.2;
                    animSeq++;
                }
            }
            else{
                animSeq++;
            }
            break;

        case 16: // Animation 17: Move the triangle to the original position

            move[0] -= 0.0125 * speedNum;
            move[1] += 0.005 * speedNum;

            if(move[0] <= 0 && move[1] >= 0)
            { 
                move[0] = 0;
                move[1] = 0;

                animSeq++;
            }
            break;
        
        

        

        default: // Reset animation sequence
            animSeq = 0;
            iterTemp++;
            break;
    }

    // Perform vertex transformation
    modelViewMatrix = mult(modelViewMatrix, rotateZ(theta[2]));
    modelViewMatrix = mult(modelViewMatrix, rotateY(theta[1]));
    modelViewMatrix = mult(modelViewMatrix, rotateX(theta[0]));
    modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
    modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2]));

    // Pass the matrix to the GPU for use in shader
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);

    // Schedule the next frame for a looped animation (60fps)
    animFrame = window.requestAnimationFrame(animUpdate);
}

// Disable the UI elements when the animation is ongoing
function disableUI()
{
    subdivSlider.disabled = true;
    iterSlider.disabled = true;
    checkTex1.disabled = true;
    checkTex2.disabled = true;
    topLeftBottomRight.disabled = true;
    topRightBottomLeft.disabled = true;
    rotateXAxis.disabled = true;
    rotateYAxis.disabled = true;
    speedDropdown.disabled = true;
    textureToggle.disabled = true;

    // Disable radio buttons in subdivision panel
    const subdivisionRadios = document.querySelectorAll(".panel input[type='radio']");
    subdivisionRadios.forEach(radio => {
        radio.disabled = true;
    });
    
    // Disable radio buttons in iteration panel
    const iterationRadios = document.querySelectorAll(".param input[type='radio']");
    iterationRadios.forEach(radio => {
        radio.disabled = true;
    });

}

// Enable the UI elements after the animation is completed
function enableUI()
{
    subdivSlider.disabled = false;
    iterSlider.disabled = false;
    checkTex1.disabled = false;
    checkTex2.disabled = false;
    topLeftBottomRight.disabled = false;
    topRightBottomLeft.disabled = false;
    rotateXAxis.disabled = false;
    rotateYAxis.disabled = false;
    speedDropdown.disabled = false;
    textureToggle.disabled = false;


    // Enable radio buttons in subdivision panel
    const subdivisionRadios = document.querySelectorAll(".panel input[type='radio']");
    subdivisionRadios.forEach(radio => {
        radio.disabled = false;
    });
    
    // Enable radio buttons in iteration panel
    const iterationRadios = document.querySelectorAll(".param input[type='radio']");
    iterationRadios.forEach(radio => {
        radio.disabled = false;
    });



}

// Reset all necessary variables to their default values
function resetValue()
{
    theta = [0, 0, 0];
    move = [0, 0, 0];
    scaleNum = 1;
    animSeq = 0;
    iterTemp = 0;
}

// Check whether whether a given number value is a power of 2
function isPowerOf2(value) 
{
    return (value & (value - 1)) == 0;
}

// Configure the texture
function configureTexture(tex)
{
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex);
	if (isPowerOf2(tex.width) && isPowerOf2(tex.height)) 
	{
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        console.log("Width: " + tex.width + ", Height: " + tex.height + " (yes)");
    } 
	
	else 
	{
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        console.log("Width: " + tex.width + ", Height: " + tex.height + " (no)");
    }
}

/*-----------------------------------------------------------------------------------*/
// 3D Sierpinski Gasket
/*-----------------------------------------------------------------------------------*/

// Form a triangle
function triangle(a, b, c, color)
{
    colors.push(baseColors[color]);
    points.push(a);
    textures.push(texCoord[0]);
    colors.push(baseColors[color]);
    points.push(b);
    textures.push(texCoord[1]);
    colors.push(baseColors[color]);
    points.push(c);
    textures.push(texCoord[2]);
}

// Form a tetrahedron with different color for each side
function tetra(a, b, c, d)
{
    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}

// subdivNum a tetrahedron
function divideTetra(a, b, c, d, count)
{
    // Check for end of recursion
    if(count === 0)
    {
        tetra(a, b, c, d);
    }

    // Find midpoints of sides and divide into four smaller tetrahedra
    else
    {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);
        --count;

        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}

/*-----------------------------------------------------------------------------------*/