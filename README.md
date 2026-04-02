
📜 Ur Quantum Engine (Ur-Q) | v8.0 ⚛️
The First Arabic-Led Quantum Simulation API for High-Fidelity 51-Qubit Research.


"From the birthplace of the first calculation (Ur), we simulate the future of computing."
Developer: Jaafar Al-Fares (@TheHolyAmstrdam) | Iraq | 2026
🗺️ Quantum Fidelity Heatmap (MPS State Space)
Below is a conceptual visualization of how Ur-Core manages entanglement across 51 qubits.
text
Qubit Index [00-50] vs Entanglement Entropy S(ρ)
Low Entanglement [░] | Medium [▒] | Full Entanglement [▓] | Error/Noise [!]

Q00: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 1.0 ebit (GHZ Root)
Q17: [▓▓▓▓▓▓▓▓▓░░░░░░░░░░░] 0.6 ebit (Shor Period r)
Q32: [▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒] 0.5 ebit (Surface Code Correction)
Q50: [░░░░░░░░░░░░░░░░░░!!] Noise Decay (T1 Model Applied)
------------------------------------------------------------
Status: STABLE | Entanglement Wall: NOT REACHED | Fidelity: 99%
يُرجى استخدام الرمز البرمجي بحذر.

⚡ Quick Start (Integration)
The Ur-Q Engine is a zero-dependency, client-side script. No server-side overhead, ensuring total Digital Sovereignty.
1. Include the Engine
html
<script src="ur-quantum-v8.js"></script>
يُرجى استخدام الرمز البرمجي بحذر.

2. Run a High-Fidelity Simulation
javascript
// Example: Factoring N=15 using 51-bit QFT Register
const result = await QuantumAsk.ask(
  "خوارزمية Shor N=15",    // query (AR/EN supported)
  "ar",                   // output language
  4,                      // r parameter (Period finding)
  8192,                   // shots (Max statistical precision)
  { cosmicRay: true }     // Toggle Nature 2020 T1 Noise Model
);

console.log(`Factors Found: ${result.sim.p} x ${result.sim.q}`); 
// Output: 3 x 5
يُرجى استخدام الرمز البرمجي بحذر.

📦 API Object Structure (result.sim)
The engine returns a rich JSON object for academic and research analysis:
Field	Type	Description
type	String	Algorithm type (Shor-QFT-51, Grover, GHZ, etc.)
counts	Object	Histogram Data: Binary state vs frequency.
p, q	Number	Extracted prime factors (Shor specific).
period_r	Number	Quantum period detected through continued fractions.
n_physical	Number	Physical qubits required for Surface Code QEC.
chi_needed	Number	Required Bond Dimension for Random Circuits.
🧪 Scientific Features (v8.0 Exclusive)
Surface Code QEC ⭐: First in the region to simulate logical qubit mapping (Distance d=3).
Cosmic Ray T₁ Model: Simulating ionizing radiation impact (Nature 2020) on 51-qubit chains.
Entanglement Wall Guard: Predictive warning for Sycamore-class random circuits to prevent memory overflow.
⚖️ Rights & Licensing
Licensed under the MIT License.
Ur-Quantum is an independent research project. All rights to the architectural design of Ur-Core belong to Jaafar Al-Fares.
Iraq | 2026
"Cuneiform logic in a Quantum world."
