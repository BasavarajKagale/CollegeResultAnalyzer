import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, Zap, BarChart3, PieChart as PieIcon, FileDown, ShieldCheck } from 'lucide-react';

// --- Simple Perlin Noise Implementation (Self-contained) ---
const dot = (g: number[], x: number, y: number, z: number) => g[0] * x + g[1] * y + g[2] * z;
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + t * (b - a);

const p = new Uint8Array(512);
const permutation = new Uint8Array([151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]);
for (let i = 0; i < 256; i++) p[i] = p[i + 256] = permutation[i];

const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const perlinNoise = (x: number, y: number, z: number) => {
    let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    let u = fade(x), v = fade(y), w = fade(z);
    let A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
    const gAA = grad3[p[AA] % 12], gBA = grad3[p[BA] % 12];
    const gAB = grad3[p[AB] % 12], gBB = grad3[p[BB] % 12];
    const gAA1 = grad3[p[AA+1] % 12], gBA1 = grad3[p[BA+1] % 12];
    const gAB1 = grad3[p[AB+1] % 12], gBB1 = grad3[p[BB+1] % 12];
    return lerp(w, lerp(v, lerp(u, dot(gAA, x, y, z), dot(gBA, x-1, y, z)),
                           lerp(u, dot(gAB, x, y-1, z), dot(gBB, x-1, y-1, z))),
                   lerp(v, lerp(u, dot(gAA1, x, y, z-1), dot(gBA1, x-1, y, z-1)),
                           lerp(u, dot(gAB1, x, y-1, z-1), dot(gBB1, x-1, y-1, z-1))));
};

class V2 {
    x: number; y: number;
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v: V2) { this.x += v.x; this.y += v.y; }
    reset(x: number, y: number) { this.x = x; this.y = y; }
    lerp(v: V2, n: number) { this.x += (v.x - this.x) * n; this.y += (v.y - this.y) * n; }
}

const LandingPage = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width: number, height: number;
        let forces: V2[] = [], particles: Particle[] = [];
        const nParticles = 200; // Decreased density
        let pIndex = 0;
        const cellSize = 20;

        class Particle {
            position = new V2(-100, -100);
            velocity = new V2();
            acceleration = new V2();
            alpha = 0;
            color = '#D4AF37';
            points = [
                new V2(-12 + Math.random() * 24, -12 + Math.random() * 24),
                new V2(-12 + Math.random() * 24, -12 + Math.random() * 24),
                new V2(-12 + Math.random() * 24, -12 + Math.random() * 24)
            ];

            update() {
                this.velocity.add(this.acceleration);
                this.position.add(this.velocity);
                this.acceleration.reset(0, 0);
                this.alpha -= 0.007; // Live slightly longer
                if (this.alpha < 0) this.alpha = 0;
            }

            follow(forces: V2[]) {
                const x = Math.floor(this.position.x / cellSize);
                const y = Math.floor(this.position.y / cellSize);
                const index = x * Math.floor(height / cellSize) + y;
                if (forces[index]) this.acceleration.add(forces[index]);
            }

            draw() {
                if (!ctx || this.alpha <= 0) return;
                ctx.globalAlpha = this.alpha;
                ctx.beginPath();
                ctx.moveTo(this.position.x + this.points[0].x, this.position.y + this.points[0].y);
                ctx.lineTo(this.position.x + this.points[1].x, this.position.y + this.points[1].y);
                ctx.lineTo(this.position.x + this.points[2].x, this.position.y + this.points[2].y);
                ctx.closePath();
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initForces();
        };

        const initForces = () => {
            forces = [];
            const cols = Math.ceil(width / cellSize);
            const rows = Math.ceil(height / cellSize);
            for (let i = 0; i < cols * rows; i++) forces.push(new V2());
        };

        const updateForces = (t: number) => {
            let i = 0;
            let xOff = 0;
            for (let x = 0; x < width; x += cellSize) {
                xOff += 0.1;
                let yOff = 0;
                for (let y = 0; y < height; y += cellSize) {
                    yOff += 0.1;
                    const a = perlinNoise(xOff, yOff, t * 0.00005) * Math.PI * 4;
                    if (forces[i]) forces[i].reset(Math.cos(a) * 0.1, Math.sin(a) * 0.1); // Lighter force
                    i++;
                }
            }
        };

        const mouse = new V2(window.innerWidth / 2, window.innerHeight / 2);
        const emitter = new V2(window.innerWidth / 2, window.innerHeight / 2);

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < nParticles; i++) particles.push(new Particle());
        };

        const launchParticle = () => {
            particles[pIndex].position.reset(emitter.x, emitter.y);
            particles[pIndex].velocity.reset(-1.2 + Math.random() * 2.4, -1.2 + Math.random() * 2.4);
            const colorHue = Math.floor(emitter.x / (width || 1) * 360);
            particles[pIndex].color = `hsl(${colorHue}, 60%, 70%)`;
            particles[pIndex].alpha = 0.8; // Lighter alpha
            pIndex = (pIndex + 1) % nParticles;
        };

        const animate = (t: number) => {
            ctx.clearRect(0, 0, width, height);
            emitter.lerp(mouse, 0.4);
            // Launch only 1 particle per frame
            launchParticle();
            updateForces(t);
            particles.forEach(p => { p.update(); p.follow(forces); p.draw(); });
            requestAnimationFrame(animate);
        };


        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleScroll = () => {
            const reveals = document.querySelectorAll('.reveal');
            reveals.forEach(el => {
                const elementTop = el.getBoundingClientRect().top;
                if (elementTop < window.innerHeight - 150) el.classList.add('active');
            });
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll);
        resize(); initParticles(); requestAnimationFrame(animate);
        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const features = [
        { icon: <Zap size={32} />, title: "Swift Processing", desc: "Parse massive Excel result sheets in milliseconds." },
        { icon: <BarChart3 size={32} />, title: "Detailed Analytics", desc: "Automatic calculation of pass rates, totals, and rankings." },
        { icon: <PieIcon size={32} />, title: "Visual Insights", desc: "Interactive dashboards with performance heatmaps." },
        { icon: <FileDown size={32} />, title: "Smart Exports", desc: "One-click professional PDF and Excel report generation." },
        { icon: <ShieldCheck size={32} />, title: "Data Integrity", desc: "Robust engine handling complex and large-scale data." },
        { icon: <GraduationCap size={32} />, title: "Academic Success", desc: "Tailored for batch performance and topper recognition." }
    ];

    return (
        <div style={{ background: 'transparent', minHeight: '100vh', position: 'relative' }}>
            {/* Base Background layer */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: -2 }} />
            
            {/* Animation Layer */}
            <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, background: 'transparent' }}>
                <div className="hero" style={{ background: 'transparent' }}>
                    <div className="hero-content">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '50%', boxShadow: '0 0 40px rgba(212, 175, 55, 0.5)' }}>
                                <GraduationCap size={48} color="#000" />
                            </div>
                        </div>
                        <h1 className="hero-title" style={{ fontSize: '5rem', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>KLECET Analytics</h1>
                        <h2 className="hero-subtitle">
                            KLE College of Engineering and Technology Chikodi
                            <br />
                            <span style={{ fontSize: '1.2rem', color: '#fff', opacity: 0.9, fontWeight: 300, letterSpacing: '3px' }}>ADVANCED RESULT MANAGEMENT SYSTEM</span>
                        </h2>
                        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                            <button onClick={() => navigate('/upload')} className="btn btn-primary" style={{ padding: '1rem 3rem' }}>
                                Access Portal <ArrowRight size={20} />
                            </button>
                            <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="btn btn-secondary" style={{ padding: '1rem 3rem' }}>
                                Explore Features
                            </button>
                        </div>
                    </div>
                </div>

                <section className="features-section" style={{ background: 'transparent' }}>
                    <div className="container">
                        <div className="reveal" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                            <h2 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#fff' }}>Unmatched Capabilities</h2>
                            <p style={{ color: 'var(--primary)', letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 600 }}>POWERING ACADEMIC EXCELLENCE</p>
                        </div>
                        <div className="feature-grid">
                            {features.map((f, i) => (
                                <div key={i} className="feature-card reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                                    <div className="feature-icon-wrapper">{f.icon}</div>
                                    <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#fff' }}>{f.title}</h3>
                                    <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.7' }}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                <footer style={{ padding: '3rem 2rem 10px', textAlign: 'center', background: 'transparent' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>KLECET</div>
                    <div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '2rem' }}>
                        ESTABLISHED 2008 • CHIKODI, KARNATAKA
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                            © 2026 KLECET Chikodi. All Rights Reserved.
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                            Designed & Developed by <button onClick={() => navigate('/admin/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }} className="designer-link">Basavaraj Kagale</button>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
