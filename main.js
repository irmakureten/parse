/* ==========================================================================
   PARSE WEBSITE INTERACTION LOGIC
   Includes: Header styling on scroll, Active links, Tab swapping,
             Photo preview modal, and Three.js 3D STL Loader.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Navigation Scrolled State & Active Indicator ---
  const header = document.getElementById('site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', () => {
    // Header shadow on scroll
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    // Scroll active link highlight
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= (sectionTop - 150)) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });
  });
  // --- 2. Mobile Menu Toggle ---
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });
  // Close mobile menu on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
  // --- 3. Card Visual Tab Switcher ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const container = button.closest('.module-visual-container');
      const targetTabId = button.getAttribute('data-tab');
      
      // Deactivate all tab buttons in this container
      container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      // Activate clicked tab button
      button.classList.add('active');
      
      // Hide all tab content panels in this container
      container.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      // Show target tab content panel
      container.querySelector(`#${targetTabId}`).classList.add('active');
      // Trigger Three.js resize if 3D viewer is loaded in that container
      const stlPanel = container.querySelector('.stl-panel');
      if (stlPanel && stlPanel.viewerInstance) {
        stlPanel.viewerInstance.onWindowResize();
      }
    });
  });
  // --- 4. Local Image Upload & Lightbox Modal ---
  const photoUploaders = document.querySelectorAll('.photo-uploader');
  const modalViewer = document.getElementById('modal-viewer');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  photoUploaders.forEach(uploader => {
    uploader.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const targetImgId = uploader.getAttribute('data-target');
        const imgElement = document.getElementById(targetImgId);
        const placeholder = uploader.closest('.photo-placeholder');
        // Create Object URL for the local photo file
        const objectURL = URL.createObjectURL(file);
        
        imgElement.src = objectURL;
        imgElement.style.display = 'block';
        placeholder.style.display = 'none';
        // Add visual click listener for lightbox Zoom
        imgElement.addEventListener('click', () => {
          modalContent.src = objectURL;
          modalViewer.classList.add('active');
        });
      }
    });
  });
  // Close Modal Lightbox
  const closeModal = () => {
    modalViewer.classList.remove('active');
  };
  modalClose.addEventListener('click', closeModal);
  modalViewer.addEventListener('click', (e) => {
    if (e.target === modalViewer || e.target === modalClose) {
      closeModal();
    }
  });
  // --- 5. Three.js 3D STL file Viewer Logic ---
  class STLViewer {
    constructor(panelElement) {
      this.panel = panelElement;
      this.canvas = panelElement.querySelector('.stl-canvas');
      this.dropzone = panelElement.querySelector('.stl-dropzone');
      this.uploader = panelElement.querySelector('.stl-uploader');
      this.spinner = panelElement.querySelector('.stl-loading-spinner');
      this.controlsContainer = panelElement.querySelector('.stl-viewer-controls');
      this.resetBtn = panelElement.querySelector('.stl-control-btn.reset');
      this.autorotateBtn = panelElement.querySelector('.stl-control-btn.autorotate');
      
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.modelMesh = null;
      
      this.isAutoRotating = false;
      this.isInitialized = false;
      // Event Listeners for file uploads
      this.dropzone.addEventListener('click', () => this.uploader.click());
      this.uploader.addEventListener('change', (e) => this.handleFileSelect(e));
      
      // Drag & Drop
      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });
      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('dragover');
      });
      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.loadSTLFile(files[0]);
        }
      });
      // Controls buttons
      this.resetBtn.addEventListener('click', () => this.resetCamera());
      this.autorotateBtn.addEventListener('click', () => this.toggleAutoRotate());
    }
    initThree() {
      if (this.isInitialized) return;
      const width = this.panel.clientWidth;
      const height = this.panel.clientHeight;
      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x07090f);
      // Camera
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 100);
      // Renderer
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      // Orbit Controls
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 1.8; // Prevent rotating underneath floor
      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(ambientLight);
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(100, 100, 100);
      this.scene.add(mainLight);
      const fillLight = new THREE.DirectionalLight(0x818cf8, 0.5);
      fillLight.position.set(-100, -50, -100);
      this.scene.add(fillLight);
      // Grid helper / Floor
      const gridHelper = new THREE.GridHelper(200, 50, 0x1f2937, 0x111827);
      gridHelper.position.y = -20;
      this.scene.add(gridHelper);
      // Bind Resize
      window.addEventListener('resize', () => this.onWindowResize());
      this.isInitialized = true;
      this.animate();
    }
    handleFileSelect(event) {
      const files = event.target.files;
      if (files.length > 0) {
        this.loadSTLFile(files[0]);
      }
    }
    loadSTLFile(file) {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        alert('Please select a valid .stl CAD file.');
        return;
      }
      this.dropzone.style.display = 'none';
      this.spinner.style.display = 'flex';
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target.result;
        
        try {
          this.initThree();
          // Parse STL
          const loader = new THREE.STLLoader();
          const geometry = loader.parse(contents);
          // Remove existing model if any
          if (this.modelMesh) {
            this.scene.remove(this.modelMesh);
          }
          // Create material with 3D print plastic feel
          const materialColor = this.getModuleColor();
          const material = new THREE.MeshStandardMaterial({
            color: materialColor,
            roughness: 0.25,
            metalness: 0.1,
            flatShading: true
          });
          this.modelMesh = new THREE.Mesh(geometry, material);
          // Center Geometry
          geometry.computeBoundingBox();
          geometry.center();
          // Calculate size to adjust scale/position automatically
          const boundingBox = geometry.boundingBox;
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          
          // Rescale model if too large or small
          const targetSize = 40;
          const scale = targetSize / maxDim;
          this.modelMesh.scale.set(scale, scale, scale);
          // Adjust position so it sits on grid
          this.modelMesh.position.y = 0;
          // Shadow settings
          this.modelMesh.castShadow = true;
          this.modelMesh.receiveShadow = true;
          this.scene.add(this.modelMesh);
          // Fit camera to object size
          this.resetCamera();
          // UI adjustments
          this.spinner.style.display = 'none';
          this.controlsContainer.style.display = 'flex';
        } catch (error) {
          console.error(error);
          alert('Error loading STL file. The file might be corrupted.');
          this.spinner.style.display = 'none';
          this.dropzone.style.display = 'flex';
        }
      };
      reader.readAsArrayBuffer(file);
    }
    getModuleColor() {
      const moduleNum = this.panel.getAttribute('data-module');
      if (moduleNum === '1') return 0x6366f1; // Indigo
      if (moduleNum === '2') return 0x10b981; // Emerald
      if (moduleNum === '3') return 0xf59e0b; // Amber
      return 0xffffff;
    }
    resetCamera() {
      if (this.controls) {
        this.camera.position.set(40, 30, 50);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    }
    toggleAutoRotate() {
      this.isAutoRotating = !this.isAutoRotating;
      this.autorotateBtn.textContent = `Auto-Rotate: ${this.isAutoRotating ? 'On' : 'Off'}`;
      if (this.isAutoRotating) {
        this.autorotateBtn.style.color = '#818cf8';
      } else {
        this.autorotateBtn.style.color = '';
      }
    }
    onWindowResize() {
      if (!this.isInitialized) return;
      const width = this.panel.clientWidth;
      const height = this.panel.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
    animate() {
      requestAnimationFrame(() => this.animate());
      if (this.isAutoRotating && this.modelMesh) {
        this.modelMesh.rotation.y += 0.01;
      }
      if (this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
  // Bind STL Viewers to panels
  const stlPanels = document.querySelectorAll('.stl-panel');
  stlPanels.forEach(panel => {
    // Store instances on the elements so tabs can access and resize them
    panel.viewerInstance = new STLViewer(panel);
  });
});
