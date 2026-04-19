# UR Quantum — Iraq Quantum Computing Lab v5.1

> Analytical & Educational Quantum Computing Simulation Platform
> Developer: Jaafar Al-Fares (@TheHolyAmstrdam) — Network Engineering & Cybersecurity student, Iraq

[![Version](https://img.shields.io/badge/version-5.1-green)]()
[![License](https://img.shields.io/badge/license-MIT-orange)]()
[![Client-Side](https://img.shields.io/badge/client--side-100%25-brightgreen)]()
[![Qubits](https://img.shields.io/badge/qubits-51-purple)]()

---

## 🔗 Live Access

* **Primary Deployment (temporarily unavailable due to resource constraints)**
* **Active Demo (temporary hosting):**
  https://dxaqzvglvz2y.space.minimax.io

> Note: The temporary deployment is used due to memory limitations encountered during high-load tensor simulations. A more scalable architecture is currently under development.

---

## 🌟 Scientific Overview

UR Quantum is an analytical quantum computing simulation platform designed to explore the behavior of key quantum algorithms within classical computational limits.

The system focuses on **algorithmic correctness, statistical fidelity, and memory-efficient representations**, rather than full exponential-state simulation.

Supported domains include:

* Shor’s Algorithm (period finding & factorization)
* Grover’s Search Algorithm
* Quantum Approximate Optimization (QAOA)
* Variational Quantum Eigensolver (VQE)
* Quantum Cryptography (BB84)
* Elliptic Curve Cryptographic Analysis (secp256k1)
* Surface Code Quantum Error Correction

---

## ⚙️ Methodological Approach

This platform follows a **hybrid analytical–computational model**:

* Analytical reconstruction of periodic structures (Shor / QFT)
* Probabilistic measurement via exact multinomial sampling
* Tensor Network representation (MPS, χ=2) for memory efficiency
* Logical gate abstractions (AND / OR / controlled operations)
* Classical post-processing (continued fractions, GCD)

This enables simulation of high-level quantum behavior without explicitly constructing a full (2^n) quantum state.

---

## 🔬 Key Capabilities

| Module                       | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| **Shor (51-bit resolution)** | Period finding using QFT peak reconstruction           |
| **QFT Analysis**             | Peak distribution & Shannon entropy                    |
| **Grover**                   | Optimal iteration (k = \lfloor \pi \sqrt{N}/4 \rfloor) |
| **QAOA**                     | MaxCut approximation                                   |
| **VQE**                      | Ground state estimation (H₂)                           |
| **BB84**                     | QKD with QBER threshold analysis                       |
| **Surface Code**             | Distance-based logical error estimation                |
| **MPS Simulation**           | Compressed quantum state representation                |

---
## 🧭 Usage Method (Query Interface)

The platform is built around a direct query interface (Natural + Structured Query), allowing users to execute quantum algorithms through clear textual commands.

### 🔹 Shor Algorithm Example

```text
Shor N=77 a=2
```

Or in an explanatory form:

```text
Shor N=77 a=2 — compute the period r, then extract the prime factors
```

### 🔹 What Happens Internally

When a query is submitted:

1. Input validation is performed (N must be odd, and gcd(a, N) = 1)
2. The periodic function is constructed: ( f(x) = a^x \mod N )
3. The QFT spectrum is reconstructed analytically
4. Peak positions are identified
5. The period ( r ) is extracted using continued fractions
6. Factors are computed via:
   [
   \gcd(a^{r/2} \pm 1, N)
   ]

### 🔹 Output Results

* The value of ( r ) (quantum period)
* Prime factorization of ( N )
* Measurement distribution (histogram)
* QFT peak analysis and statistical interpretation

## ⚠️ Engineering Constraints

Due to the computational complexity of tensor-based simulation and high-resolution sampling:

* Memory usage scales significantly with system size
* Serverless platforms (e.g., Vercel) may exceed runtime/memory limits
* Current deployment is optimized for **demonstration and analysis**, not large-scale production workloads

Ongoing work includes:

* Backend offloading to dedicated compute environments
* Further tensor compression strategies
* Adaptive sampling techniques

---

## 📁 Project Structure

```
UR-Quantum/
│
├── index.html
├── api/
│   ├── app.py
│   ├── shor_core.py
│   ├── ask.js
│   ├── middleware.js
│   └── run.js
├── requirements.txt
├── vercel.json
└── README.md
```

---

## 🧠 Scientific Positioning

This project should be understood as:

> A **research-oriented analytical simulator** for studying quantum algorithms and their implications on classical cryptographic systems.

It does **not** attempt to emulate a full physical quantum computer, but instead provides:

* mathematically consistent behavior
* statistically valid measurement distributions
* scalable classical approximations

---

## 👤 Developer Note

This project is fully developed **independently** by a single student, outside formal academic research environments.

It reflects ongoing work toward bridging:

* Quantum Computing
* Cryptography
* Cybersecurity

---

*"From the land of Ur, where the first word was written — we explore the future of computation."*
