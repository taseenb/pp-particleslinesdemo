var createBackground = require('./bg');
var isMobile = require('ismobilejs');


function Particles(opt) {
  var defaults = {
    count: 300,
    radius: 600,
    showDots: true,
    showLines: true,
    maxDistance: 50,
    maxConnections: 2,
    maxTotalConnections: 500,
    speed: 3,
    rotationSpeed: 0.25,
    showSphere: false
  };

  this.params = Object.assign({}, defaults, opt);

  //
  // this.rHalf = this.params.radius / 2;
  this.particlesData = [];
}

Particles.prototype = {
  init: function () {
    if (!Detector.webgl) {
      Detector.addGetWebGLMessage();
      return;
    }

    // Preload assets logic here (if needed)
    this.onLoadComplete();

    return this;
  },

  onLoadComplete: function (object) {
    this
      .initCamera()
      .initScene()
      .initGroup()
      .initMaterials()
      .initRenderer()
      .initUI()
      .initDatGui()
      .initStats()
      .initControls()
      .initEvents()

      .onWindowResize()
      // .initExport()
      .initMouseParallax()
      .initElements()
      .initBg()
      .initClock()

      .animate();
  },

  // initExport: function () {
  //   this.floatingDiv = document.createElement('div');
  //   this.floatingDiv.className = 'floating';
  //   document.body.appendChild(this.floatingDiv);
  //
  //   this.exportBtn = document.createElement('div');
  //   this.exportBtn.id = 'export-btn';
  //   this.exportBtn.innerHTML = 'Export to OBJ'
  //   document.body.appendChild(this.exportBtn);
  //
  //   this.exportBtn.addEventListener('click', this.exportToObj.bind(this), false);
  //
  //   return this;
  // },
  //
  // exportToObj: function () {
  //   console.log('exporting...');
  //   var exporter = new THREE.OBJExporter();
  //   var result = exporter.parse(this.scene);
  //   this.floatingDiv.style.display = 'block';
  //   this.floatingDiv.innerHTML = result.split('\n').join('<br />');
  // },

  initCamera: function () {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    this.camera.position.z = 1750;

    return this;
  },

  initScene: function () {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0003);

    return this;
  },

  initGroup: function () {
    this.group = new THREE.Group();
    this.linesGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();

    this.group.add(this.linesGroup);
    this.group.add(this.particlesGroup);
    this.scene.add(this.group);

    return this;
  },

  initMaterials: function () {
    this.particlesMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 3,
      blending: THREE.AdditiveBlending,
      transparent: true,
      sizeAttenuation: false
    });

    this.linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: THREE.VertexColors,
      blending: THREE.AdditiveBlending,
      transparent: true,
      fog: true,
      color: 0xFFFFFF
    });

    this.sphereMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      wireframeLinewidth: 0.1,
      transparent: true,
      opacity: 0.1,
      fog: true,
      blending: THREE.AdditiveBlending
    });

    return this;
  },

  initRenderer: function () {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.container.appendChild(this.renderer.domElement);

    return this;
  },

  initUI: function () {
    this.uiContainer = document.getElementById('ui');

    // Show/hide UI button
    document.getElementById('ui-btn').addEventListener('click', (e) => {
      document.body.classList.toggle('show-ui');
    });

    return this;
  },

  initDatGui: function () {
    this.gui = new dat.GUI({autoPlace: false});
    // this.gui.add(this.params, 'radius', 50, 1000).listen();
    this.gui.add(this.params, 'maxDistance', 0, 1000).listen();
    this.gui.add(this.params, 'maxConnections', 1, 20).step(1).listen();
    this.gui.add(this.params, 'speed', 0, 20).listen();
    this.gui.add(this.params, 'rotationSpeed', 0, 1).step(0.01).listen();
    var showSphereControl = this.gui.add(this.params, 'showSphere');
    showSphereControl.onChange((show) => {
      if (this.sphereMesh) {
        this.sphereMesh.material.visible = show;
        this.sphereMesh.material.needsUpdate = true;
      }
    });

    this.uiContainer.appendChild(this.gui.domElement);

    return this;
  },

  initControls: function () {
    this.controls = new THREE.OrbitControls(this.camera, this.container);

    return this;
  },

  initStats: function () {
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    this.stats.dom.id = 'stats';
    this.uiContainer.appendChild(this.stats.domElement);

    return this;
  },

  initEvents: function () {
    // document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    // document.addEventListener('touchstart', this.onDocumentTouchStart.bind(this), false);
    // document.addEventListener('touchmove', this.onDocumentTouchMove.bind(this), false);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    return this;
  },

  initMouseParallax: function () {
    // Mouse parallax effect
    this.cameraDistance = 1.75; //isMobile ? 2 : 1.75;
    this.theta = 0 * Math.PI / 180;
    this.angleOffset = 40;
    this.mouseOffset = new THREE.Vector2();
    this.tmpQuat1 = new THREE.Quaternion();
    this.tmpQuat2 = new THREE.Quaternion();
    this.AXIS_X = new THREE.Vector3(1, 0, 0);
    this.AXIS_Y = new THREE.Vector3(0, 1, 0);

    // Mouse parallax
    document.addEventListener('mousemove', (e) => {
      var x = e.clientX;
      var y = e.clientY;
      TweenMax.to(this.mouseOffset, 0.5, {
        x: (x / this.w * 2 - 1),
        y: (y / this.h * 2 - 1),
        ease: 'expoOut',
        overwrite: 'all'
      });
    });

    return this;
  },

  initElements: function () {
    // create the particles
    var count = this.params.count;
    var r = this.params.radius;
    var maxLines = this.params.maxTotalConnections; //count * count;

    // Create sphere
    this.sphereGeometry = new THREE.SphereBufferGeometry(r, 16, 16);
    this.sphereMesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    this.group.add(this.sphereMesh);

    // Create points
    this.particlesGeometry = new THREE.BufferGeometry();
    this.particlePositions = this.getSphere(count, r);
    this.particlesGeometry.addAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3).setDynamic(true));
    // this.particlesGeometry.addGroup(0, count, 0);
    this.pointCloud = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
    this.particlesGroup.add(this.pointCloud);

    // Create particles data (velocity)
    for (var i = 0; i < count; i++) {
      var v = function () {
        return (-.5 + Math.random()) * Math.random();
      }.bind(this);
      this.particlesData.push({
        velocity: new THREE.Vector3(v(), v(), v()),
        connections: 0
      });
    }

    // Create the lines between particles
    this.linesGeometry = new THREE.BufferGeometry();
    this.linePositions = new Float32Array(maxLines * 3);
    this.lineColors = new Float32Array(maxLines * 3);
    this.linesGeometry.addAttribute('position', new THREE.BufferAttribute(this.linePositions, 3).setDynamic(true));
    this.linesGeometry.addAttribute('color', new THREE.BufferAttribute(this.lineColors, 3).setDynamic(true));
    this.linesGeometry.computeBoundingSphere();
    // this.linesGeometry.addGroup(0, maxLines, 0);
    this.linesGeometry.setDrawRange(0, 0);

    this.linesMesh = new THREE.LineSegments(this.linesGeometry, this.linesMaterial);
    this.linesGroup.add(this.linesMesh);


    return this;
  },

  // Returns a Float32Array buffer with random points in a cube
  getRandomData: function (width, height, size) {
    var len = width * height * 3;
    var data = new Float32Array(len);
    while (len--)data[len] = ( Math.random() - .5 ) * size;
    return data;
  },

  // Returns a Float32Array buffer of spherical 3D points
  getSphere: function (vertices, size) {
    var getPoint = function (v, size) {
      v.x = Math.random() * 2 - 1;
      v.y = Math.random() * 2 - 1;
      v.z = Math.random() * 2 - 1;
      if (v.length() > 1) return getPoint(v, size);
      return v.normalize().multiplyScalar(size * Math.random());
    };
    var len = vertices * 3;
    var data = new Float32Array(len);
    var p = new THREE.Vector3();
    for (var i = 0; i < len; i += 3) {
      getPoint(p, size);
      data[i] = p.x;
      data[i + 1] = p.y;
      data[i + 2] = p.z;
    }
    return data;
  },

  initBg: function () {
    this.background = createBackground();
    this.scene.add(this.background);

    return this;
  },

  onWindowResize: function () {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.windowHalfX = this.w / 2;
    this.windowHalfY = this.h / 2;
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.w, this.h);

    return this;
  },

  onDocumentMouseMove: function (event) {
    this.mouseX = event.clientX - this.windowHalfX;
    this.mouseY = event.clientY - this.windowHalfY;
  },

  onDocumentTouchStart: function (event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.mouseX = event.touches[0].pageX - this.windowHalfX;
      this.mouseY = event.touches[0].pageY - this.windowHalfY;
    }
  },

  onDocumentTouchMove: function (event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.mouseX = event.touches[0].pageX - this.windowHalfX;
      this.mouseY = event.touches[0].pageY - this.windowHalfY;
    }
  },

  initClock: function () {
    this.clock = new THREE.Clock();
    this.clock.start();

    return this;
  },

  animate: function () {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
    this.stats.update();
  },

  resetAllConnections: function (t) {
    this.connected = 0;
    this.particlesData.forEach(function (d) {
      d.connections = 0;
    });
  },

  render: function () {
    var time = this.clock.elapsedTime;
    var delta = this.clock.getDelta();

    this.draw(time, delta);

    this.group.rotation.y = time * this.params.rotationSpeed;
    this.renderer.render(this.scene, this.camera);
  },

  draw: function (t, d) {
    this.resetAllConnections(t);

    var count = this.params.count;
    var vertexpos = 0;
    var colorpos = 0;
    var radius = this.params.radius;
    var v1 = new THREE.Vector3(); // particle1 vector
    var v2 = new THREE.Vector3(); // particle2 vector
    var p = this.particlePositions;
    var l = this.linePositions;

    for (var i = 0; i < count; i++) {
      // Get particle data
      var particleData = this.particlesData[i];

      // Add velocity to the position
      v1.x = p[i * 3] += particleData.velocity.x * this.params.speed;
      v1.y = p[i * 3 + 1] += particleData.velocity.y * this.params.speed;
      v1.z = p[i * 3 + 2] += particleData.velocity.z * this.params.speed;

      // if (t < .5 && i === 50) {
      //   console.log(particleData.connections);
      //   // console.log(v1.x, v1.y, v1.z);
      // }

      // Bounce on the borders of the invisible sphere
      if (v1.length() >= radius + 1) {
        particleData.velocity.reflect(v1.clone().normalize());
      }

      // Limit connections between particles
      if (this.connected > this.params.maxTotalConnections || particleData.connections > this.params.maxConnections)
        continue;

      // Check distance from all the other particles
      for (var j = 0; j < count; j++) {
        if (i === j)
          continue;

        var particleDataB = this.particlesData[j];

        if (particleData.connections > this.params.maxConnections || particleDataB.connections > this.params.maxConnections)
          continue;

        // Get distance from the current particle
        v2.x = p[j * 3];
        v2.y = p[j * 3 + 1];
        v2.z = p[j * 3 + 2];
        var dist = v1.distanceTo(v2);

        // if (t < .5 && j < 10) {
        //   console.log(particleData.connections);
        //   // console.log(v1.x, v1.y, v1.z);
        //   // console.log(v2.x, v2.y, v2.z);
        //   // console.log(dist);
        // }

        // Update line connections position and color (the closer the brighter)
        if (dist < this.params.maxDistance) {
          var alpha = 1.0 - dist / this.params.maxDistance;

          l[vertexpos++] = p[i * 3];
          l[vertexpos++] = p[i * 3 + 1];
          l[vertexpos++] = p[i * 3 + 2];

          l[vertexpos++] = p[j * 3];
          l[vertexpos++] = p[j * 3 + 1];
          l[vertexpos++] = p[j * 3 + 2];

          this.lineColors[colorpos++] = alpha;
          this.lineColors[colorpos++] = alpha;
          this.lineColors[colorpos++] = alpha;

          this.lineColors[colorpos++] = alpha;
          this.lineColors[colorpos++] = alpha;
          this.lineColors[colorpos++] = alpha;

          // Keep count of connections
          particleData.connections++;
          particleDataB.connections++;
          this.connected++;
        }
      }

    }

    this.linesMesh.geometry.setDrawRange(0, this.connected * 2);
    this.linesMesh.geometry.attributes.position.needsUpdate = true;
    this.linesMesh.geometry.attributes.color.needsUpdate = true;
    this.pointCloud.geometry.attributes.position.needsUpdate = true;

    // BG
    if (!isMobile.any) {
      // Camera + mouse parallax effect
      const phi = Math.PI / 2;
      // camera.position.x = Math.sin(phi) * Math.sin(theta);
      // camera.position.y = Math.cos(phi);
      // camera.position.z = 300 * (Math.sin(phi) * Math.cos(theta));
      const radius = this.cameraDistance;
      const radianOffset = this.angleOffset * Math.PI / 180;
      const xOff = this.mouseOffset.y * radianOffset;
      const yOff = this.mouseOffset.x * radianOffset;
      this.tmpQuat1.setFromAxisAngle(this.AXIS_X, -xOff);
      this.tmpQuat2.setFromAxisAngle(this.AXIS_Y, -yOff);
      this.tmpQuat1.multiply(this.tmpQuat2);
      // camera.position.applyQuaternion(tmpQuat1);
      // camera.position.multiplyScalar(radius);
      // target.set(0, 0, 0);
      // camera.lookAt(target);

      this.background.style({
        aspect: this.w / this.h,
        aspectCorrection: true,
        scale: 2.0,
        offset: [0.2 * yOff, -0.2 * xOff],
        // ensure even grain scale based on width/height
        grainScale: 1.5 / Math.min(this.w, this.h)
      });
    }
  }

};


window.onload = () => {

  // Start
  var p = new Particles({
    count: 250,
    radius: 500,
    maxDistance: 100,
    maxConnections: 5,
    maxTotalConnections: 1000,
    speed: 5
  });
  p.init();

  // UI stuff
  document.body.classList.remove('show-loader');
  document.body.classList.add('show-ui-btn');
};
