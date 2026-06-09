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
  // --- 3. Card Visual Tab Switcher & 3D Load Trigger ---
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
      // Trigger Three.js load or resize if 3D viewer is selected
      const stlPanel = container.querySelector('.stl-panel');
      if (stlPanel && stlPanel.viewerInstance) {
        if (targetTabId.endsWith('-3d')) {
          stlPanel.viewerInstance.loadDefaultSTLOnce();
        } else {
          stlPanel.viewerInstance.onWindowResize();
        }
      }
    });
  });
  // --- 4. Lightbox Modal for Static Photos ---
  const previewImages = document.querySelectorAll('.preview-image, .hero-project-image');
  const modalViewer = document.getElementById('modal-viewer');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  previewImages.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      modalContent.src = img.getAttribute('src');
      modalViewer.classList.add('active');
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
      this.hasLoadedDefault = false;
      // Automatically load default STL file from path if provided
      this.defaultSrc = panelElement.getAttribute('data-stl-src');
      // Bind Event Listeners for local file uploads (fallback if default load fails)
      if (this.dropzone) {
        this.dropzone.addEventListener('click', () => {
          if (this.uploader) this.uploader.click();
        });
      }
      if (this.uploader) {
        this.uploader.addEventListener('change', (e) => this.handleFileSelect(e));
      }
      
      // Drag & Drop fallbacks
      if (this.dropzone) {
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
      }
      // Controls buttons
      if (this.resetBtn) {
        this.resetBtn.addEventListener('click', () => this.resetCamera());
      }
      if (this.autorotateBtn) {
        this.autorotateBtn.addEventListener('click', () => this.toggleAutoRotate());
      }
    }
    initThree() {
      if (this.isInitialized) return;
      const width = this.panel.clientWidth;
      const height = this.panel.clientHeight;
      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf3f7f8);
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
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(100, 100, 100);
      this.scene.add(mainLight);
      const fillLight = new THREE.DirectionalLight(0x818cf8, 0.3);
      fillLight.position.set(-100, -50, -100);
      this.scene.add(fillLight);
      // Grid helper / Floor (Soft colored lines for pastel theme)
      const gridHelper = new THREE.GridHelper(200, 50, 0xbccfd1, 0xd9e5e6);
      gridHelper.position.y = -20;
      this.scene.add(gridHelper);
      // Bind Resize
      window.addEventListener('resize', () => this.onWindowResize());
      this.isInitialized = true;
      this.animate();
    }
    loadDefaultSTLOnce() {
      if (this.hasLoadedDefault) {
        this.onWindowResize();
        return;
      }
      this.hasLoadedDefault = true;
      if (!this.defaultSrc) {
        if (this.dropzone) this.dropzone.style.display = 'flex';
        return;
      }
      if (this.spinner) this.spinner.style.display = 'flex';
      if (this.dropzone) this.dropzone.style.display = 'none';
      this.initThree();
      const loader = new THREE.STLLoader();
      loader.load(
        this.defaultSrc,
        (geometry) => {
          this.handleGeometry(geometry);
        },
        (xhr) => {
          // Progress tracking could go here
        },
        (error) => {
          console.warn('Error loading default STL (likely CORS or offline fallback):', error);
          this.hasLoadedDefault = false; // Allow retry
          if (this.spinner) this.spinner.style.display = 'none';
          if (this.dropzone) {
            this.dropzone.style.display = 'flex';
            const dropMsg = this.dropzone.querySelector('p');
            if (dropMsg) {
              dropMsg.innerHTML = 'Unable to auto-load 3D model due to CORS restrictions without a local server.<br><strong>Drag & drop the STL file here to view it manually.</strong>';
            }
          }
        }
      );
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
      if (this.dropzone) this.dropzone.style.display = 'none';
      if (this.spinner) this.spinner.style.display = 'flex';
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target.result;
        
        try {
          this.initThree();
          // Parse STL
          const loader = new THREE.STLLoader();
          const geometry = loader.parse(contents);
          this.handleGeometry(geometry);
          this.hasLoadedDefault = true; // Mark as loaded to prevent overriding
        } catch (error) {
          console.error(error);
          alert('Error loading STL file. The file might be corrupted.');
          if (this.spinner) this.spinner.style.display = 'none';
          if (this.dropzone) this.dropzone.style.display = 'flex';
        }
      };
      reader.readAsArrayBuffer(file);
    }
    handleGeometry(geometry) {
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
      if (this.spinner) this.spinner.style.display = 'none';
      if (this.controlsContainer) this.controlsContainer.style.display = 'flex';
      if (this.dropzone) this.dropzone.style.display = 'none';
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
    panel.viewerInstance = new STLViewer(panel);
  });
});
