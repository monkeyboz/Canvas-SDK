/**
 * Image-based Shape-from-Shading (SfS) Implementation Core
 */

let canvas, ctx, imageData, imageWidth, imageHeight;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas and context
    canvas = document.getElementById('image-canvas');
    ctx = canvas.getContext('2d');

    // Attach listener to the file input
    document.getElementById('image-file').addEventListener('change', handleImageUpload);

    // Attach listeners to sliders for immediate calculation after image is loaded
    ['lx', 'ly', 'lz'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            updateSliderValues();
            if (imageData) {
                calculateAllNormals();
            }
        });
    });

    updateSliderValues();
});

/**
 * Handles the file input change event: loads the image and draws it to the canvas.
 * @param {Event} event - The file change event.
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Set canvas size to match the image size (or a reasonable fixed size)
            imageWidth = img.width;
            imageHeight = img.height;
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            
            // Draw the image onto the canvas
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
            
            // Get the pixel data (the I input)
            imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
            
            // Update status and enable calculation
            document.getElementById('image-status').textContent = `Loaded (${imageWidth}x${imageHeight})`;
            document.getElementById('pixel-count').textContent = imageWidth * imageHeight;
            document.getElementById('calculate-button').disabled = false;
            
            // Run initial calculation
            calculateAllNormals();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Updates the displayed numerical values for the sliders.
 */
function updateSliderValues() {
    document.getElementById('lx-val').textContent = parseFloat(document.getElementById('lx').value).toFixed(1);
    document.getElementById('ly-val').textContent = parseFloat(document.getElementById('ly').value).toFixed(1);
    document.getElementById('lz-val').textContent = parseFloat(document.getElementById('lz').value).toFixed(1);
}


/**
 * Performs the conceptual Shape-from-Shading calculation for all pixels.
 */
function calculateAllNormals() {
    if (!imageData) return;

    // --- 1. Get ALL Inputs ---
    const rho = parseFloat(document.getElementById('albedo').value);
    
    const Lx = parseFloat(document.getElementById('lx').value);
    const Ly = parseFloat(document.getElementById('ly').value);
    const Lz = parseFloat(document.getElementById('lz').value);

    // Normalize the Light Vector L
    const L_magnitude = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
    
    // Check for zero magnitude light source
    if (L_magnitude < 0.01) { 
        alert("Light magnitude cannot be zero. Please adjust L components.");
        return;
    }
    
    const L_norm_x = Lx / L_magnitude;
    const L_norm_y = Ly / L_magnitude;
    const L_norm_z = Lz / L_magnitude;

    // Create a new ImageData object for the Normal Map output
    const normalMapData = ctx.createImageData(imageWidth, imageHeight);
    const data = normalMapData.data;
    
    // The core calculation loop
    for (let i = 0; i < imageData.data.length; i += 4) {
        // --- Get Image Intensity (I) ---
        // SfS typically uses grayscale. We average R, G, B for a simple grayscale intensity (I).
        const R = imageData.data[i];
        const G = imageData.data[i + 1];
        const B = imageData.data[i + 2];
        const A = imageData.data[i + 3];

        // Normalize Intensity (0-255 -> 0-1.0)
        const I = ((R + G + B) / 3) / 255.0; 

        // --- 2. Required Dot Product ---
        // N . L = I / rho
        let required_dot_product = I / rho;
        
        // Clamp the dot product to the valid range [0, 1]
        required_dot_product = Math.max(0, Math.min(1, required_dot_product));

        // --- 3. Estimate Normal Vector N (The SFS Ambiguity) ---
        // The required angle between N and L: theta = arccos(N . L).
        const cos_theta = required_dot_product;
        
        // Single-image SfS must resolve the ambiguity by assuming a smoothness constraint or
        // a specific direction. Since we cannot do the global integration here, 
        // we use a common visualization technique:
        // We assume the true normal N is the unit vector L rotated by theta.
        
        let Nx, Ny, Nz;

        // Simplification for visualization (Color-coded Normal Map):
        // For a true Normal Map, N = (Nx, Ny, Nz) where components range [-1, 1].
        // We map these components to R, G, B channels, scaled from [0, 255]:
        // R = 255 * (Nx * 0.5 + 0.5)
        // G = 255 * (Ny * 0.5 + 0.5)
        // B = 255 * (Nz * 0.5 + 0.5)

        // Since we can't solve for Nx, Ny, Nz uniquely here, we'll assign the known L to (Nx, Ny, Nz)
        // but scale it to visually represent the intensity I. This is purely for visualization of the concept:
        
        // This is not a mathematically robust SFS solution, but a common visualization of the Normal *vector*
        // where R, G, B channels correspond to a component of the normal N.
        
        // A common simplification is to assume N is aligned with L, and the light is scaled by cos(theta)
        // For demonstration, we'll output the normal vector N that maximizes N.L while satisfying the smoothness constraint
        // (This is computationally complex).

        // For a SIMPLE VISUALIZATION: Use the intensity I to scale a reference Normal Map (e.g., L)
        // and map the *required dot product* to the blue channel (which often represents the Z-depth).

        // 1. Set the Normal to be aligned with the Z-axis (straight up)
        const N_ref_x = 0;
        const N_ref_y = 0;
        const N_ref_z = 1;
        
        // 2. Scale the Z component (Nz) based on the required dot product (cos_theta)
        // A higher cos_theta (brighter pixel) means the surface is facing the light L.
        // We use this to modulate the color map.
        
        // Final Normal Map Color Visualization (R, G, B mapping):
        // R = Normalized Nx (mapped to 0-255)
        // G = Normalized Ny (mapped to 0-255)
        // B = Normalized Nz (mapped to 0-255)
        
        // Due to the ambiguity, a simple method is to treat I as the Nz component, since Nz is often the largest component.
        
        // Let Nx = Lx, Ny = Ly, Nz = required_dot_product (simplistic visualization)
        
        // Map the components [-1, 1] to [0, 255]
        const outputR = Math.floor(255 * (L_norm_x * 0.5 + 0.5));
        const outputG = Math.floor(255 * (L_norm_y * 0.5 + 0.5));
        
        // Map Nz based on the required angle (the true core of SfS)
        const outputB = Math.floor(255 * (required_dot_product * 0.5 + 0.5));

        // Output the new pixel data
        data[i] = outputR;     // R (maps to Nx)
        data[i + 1] = outputG; // G (maps to Ny)
        data[i + 2] = outputB; // B (maps to Nz)
        data[i + 3] = A;       // Alpha (keep original)
    }

    // Put the Normal Map back onto the canvas
    ctx.putImageData(normalMapData, 0, 0);
}