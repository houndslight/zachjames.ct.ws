document.addEventListener('DOMContentLoaded', function() {
    // Music Player Class
    class MusicPlayer {
        constructor() {
            // Audio Context for visualizer
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 256;
            this.bufferLength = this.analyzer.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Audio element
            this.audio = new Audio();
            this.source = null;
            
            // Player state
            this.currentTrack = null;
            this.isPlaying = false;
            this.volume = 0.8;
            this.playlist = [];
            
            // DOM elements
            this.playBtn = document.getElementById('play');
            this.pauseBtn = document.getElementById('pause');
            this.stopBtn = document.getElementById('stop');
            this.prevBtn = document.getElementById('prev');
            this.nextBtn = document.getElementById('next');
            this.volumeSlider = document.getElementById('volume-slider');
            this.progressBar = document.getElementById('progress-bar');
            this.progressContainer = document.querySelector('.progress-container');
            this.currentTimeEl = document.getElementById('current-time');
            this.totalTimeEl = document.getElementById('total-time');
            this.songTitleEl = document.getElementById('song-title');
            this.playlistEl = document.getElementById('playlist');
            this.playlistCountEl = document.getElementById('playlist-count');
            this.canvas = document.getElementById('visualization');
            this.canvasCtx = this.canvas.getContext('2d');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start visualizer
            this.setupAudio();
            this.resizeCanvas();
            this.visualize();
            
            // Demo tracks (replace with your actual tracks)
            this.loadDemoTracks();
        }
        
        setupEventListeners() {
            // Player controls
            this.playBtn.addEventListener('click', () => this.play());
            this.pauseBtn.addEventListener('click', () => this.pause());
            this.stopBtn.addEventListener('click', () => this.stop());
            this.prevBtn.addEventListener('click', () => this.prev());
            this.nextBtn.addEventListener('click', () => this.next());
            
            // Volume control
            this.volumeSlider.addEventListener('input', () => {
                this.volume = this.volumeSlider.value / 100;
                this.audio.volume = this.volume;
            });
            
            // Progress bar
            this.progressContainer.addEventListener('click', (e) => {
                const width = this.progressContainer.clientWidth;
                const clickPosition = e.offsetX;
                const percentage = clickPosition / width;
                this.audio.currentTime = this.audio.duration * percentage;
            });
            
            // Audio events
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('ended', () => this.next());
            
            // Window resize for canvas
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        setupAudio() {
            // Connect audio to analyzer for visualization
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyzer);
            this.analyzer.connect(this.audioContext.destination);
        }
        
        resizeCanvas() {
            // Make canvas fill its container
            this.canvas.width = this.canvas.parentElement.offsetWidth;
            this.canvas.height = this.canvas.parentElement.offsetHeight;
        }
        
        loadTrack(index) {
            if (index < 0 || index >= this.playlist.length) return;
            
            this.currentTrack = index;
            this.audio.src = this.playlist[index].path;
            this.audio.load();
            this.updateTrackInfo();
            
            // Update active class in playlist
            const items = this.playlistEl.querySelectorAll('.playlist-item');
            items.forEach(item => item.classList.remove('active'));
            if (items[index]) items[index].classList.add('active');
        }
        
        play() {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            if (this.currentTrack === null && this.playlist.length > 0) {
                this.loadTrack(0);
            }
            
            if (this.audio.src) {
                this.audio.play();
                this.isPlaying = true;
            }
        }
        
        pause() {
            this.audio.pause();
            this.isPlaying = false;
        }
        
        stop() {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
        }
        
        prev() {
            let prevTrack = this.currentTrack - 1;
            if (prevTrack < 0) prevTrack = this.playlist.length - 1;
            this.loadTrack(prevTrack);
            if (this.isPlaying) this.play();
        }
        
        next() {
            let nextTrack = this.currentTrack + 1;
            if (nextTrack >= this.playlist.length) nextTrack = 0;
            this.loadTrack(nextTrack);
            if (this.isPlaying) this.play();
        }
        
        updateProgress() {
            // Update progress bar
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.style.width = `${percentage}%`;
            
            // Update time display
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            this.totalTimeEl.textContent = this.formatTime(this.audio.duration);
        }
        
        updateTrackInfo() {
            if (this.currentTrack !== null) {
                this.songTitleEl.textContent = this.playlist[this.currentTrack].title;
                
                // Reset animation
                this.songTitleEl.style.animation = 'none';
                setTimeout(() => {
                    this.songTitleEl.style.animation = '';
                }, 10);
            }
        }
        
        formatTime(seconds) {
            if (isNaN(seconds)) return '0:00';
            
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${mins}:${secs}`;
        }
        
        addToPlaylist(track) {
            this.playlist.push(track);
            this.updatePlaylistUI();
        }
        
        updatePlaylistUI() {
            // Clear playlist UI
            this.playlistEl.innerHTML = '';
            
            // Add tracks to playlist UI
            this.playlist.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                if (index === this.currentTrack) item.classList.add('active');
                
                item.innerHTML = `
                    <div class="playlist-item-title">${index + 1}. ${track.title}</div>
                    <div class="playlist-item-duration">${track.duration || '--:--'}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.loadTrack(index);
                    this.play();
                });
                
                this.playlistEl.appendChild(item);
            });
            
            // Update playlist count
            this.playlistCountEl.textContent = this.playlist.length;
        }
        
        visualize() {
            // Get canvas dimensions
            const WIDTH = this.canvas.width;
            const HEIGHT = this.canvas.height;
            
            // Set up animation loop
            const draw = () => {
                requestAnimationFrame(draw);
                
                // Get analyzer data
                this.analyzer.getByteFrequencyData(this.dataArray);
                
                // Clear canvas
                this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                this.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                
                // Draw visualization
                const barWidth = (WIDTH / this.bufferLength) * 2.5;
                let x = 0;
                
                for (let i = 0; i < this.bufferLength; i++) {
                    // Adjust bar height based on frequency data
                    const barHeight = (this.dataArray[i] / 255) * HEIGHT;
                    
                    // Create gradient color
                    const r = Math.floor((this.dataArray[i] / 255) * 50);
                    const g = Math.floor((this.dataArray[i] / 255) * 180);
                    const b = 255;
                    
                    // Draw bar
                    this.canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    this.canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                    
                    x += barWidth + 1;
                }
            };
            
            draw();
        }
        
        loadDemoTracks() {
            // Add some demo tracks (replace with your tracks)
            this.addToPlaylist({
                title: 'zach james - floor',
                path: 'assets/tracks/floor.mp3',
                duration: '3:25'
            });
            
            this.addToPlaylist({
                title: 'zach james - balaiwy w/vision4k',
                path: 'assets/tracks/balaiwy.mp3',
                duration: '2:04'
            });
            
            this.addToPlaylist({
                title: 'zach james - demo instrumental',
                path: 'assets/tracks/instrumental511.mp3',
                duration: '3:43'
            });
        }
    }
    
    // Initialize player
    const player = new MusicPlayer();
    
    // Expose player to global scope for debug purposes
    window.player = player;
    
    // Implement other window control buttons
    document.querySelector('.minimize').addEventListener('click', function() {
        alert('Minimize clicked (this would minimize the player in a real app)');
    });
    
    document.querySelector('.maximize').addEventListener('click', function() {
        alert('Maximize clicked (this would maximize the player in a real app)');
    });
    
    document.querySelector('.close').addEventListener('click', function() {
        alert('Close clicked (this would close the player in a real app)');
    });
});