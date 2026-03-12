export default async function handler(req, res) {
  const { query } = req.body;
  const q = (query || "").toLowerCase();

  const answers = {
    bell: "Bell State هو أبسط مثال على التشابك الكمي — كيوبتان مترابطان قياس أحدهما يحدد الآخر فوراً.",
    superposition: "التراكب الكمي هو قدرة الكيوبت على التواجد في حالتي 0 و1 في نفس الوقت حتى لحظة القياس.",
    grover: "خوارزمية Grover تبحث في قاعدة بيانات بـ √N خطوة بدل N — أسرع بكثير من الكلاسيكي.",
  };

  let answer = "يمكنني شرح Bell State، Superposition، أو Grover بالتفصيل.";
  for (const key in answers) {
    if (q.includes(key)) { answer = answers[key]; break; }
  }

  res.status(200).json({ answer, code: "", result: "" });
}
