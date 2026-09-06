const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;


/* =========================
   HOME TEST
========================= */

app.get("/", function (req, res) {
  res.json({
    success: true,
    message: "Skillchek AI Server is running"
  });
});


/* =========================
   GENERATE ASSESSMENT
========================= */

app.post("/api/generate-assessment", async function (req, res) {

  try {

    const candidate = req.body;

    const name = candidate.name || "Candidate";
    const education = candidate.education || "";
    const course = candidate.course || "";
    const experience = candidate.experience || "";
    const role = candidate.role || "";
    const skills = candidate.skills || "";


    if (!course || !skills || !role) {

      return res.status(400).json({
        success: false,
        message: "Course, skills and target role are required."
      });

    }


    const prompt = `
You are an expert technical assessment generator for Skillchek AI.

Create a personalized competency assessment for this candidate.

Candidate Information:

Name: ${name}
Education Level: ${education}
Current Course: ${course}
Experience Level: ${experience}
Target Role: ${role}
Skills: ${skills}

IMPORTANT RULES:

1. Generate EXACTLY 20 multiple-choice questions.
2. Questions must be strongly related to the candidate's CURRENT COURSE, TARGET ROLE and SKILLS.
3. Do NOT generate generic questions unrelated to the selected skills.
4. Distribute questions across the provided skills as reasonably as possible.
5. Questions should test actual competency, not just definitions.
6. Include a mixture of easy, medium and difficult questions.
7. Every question must have exactly 4 options.
8. Only ONE option can be correct.
9. Do not reveal the correct answer inside the question or options.
10. Each question must have a category.
11. Do not repeat questions.
12. Return ONLY valid JSON.
13. Do not use markdown.
14. Do not add explanations outside JSON.

Return JSON in exactly this structure:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": 0,
      "category": "Skill name",
      "difficulty": "Easy"
    }
  ]
}

The "answer" value must be:
0 for the first option,
1 for the second option,
2 for the third option,
3 for the fourth option.
`;


    const apiKey = process.env.GEMINI_API_KEY;


    if (!apiKey) {

      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing in .env file."
      });

    }


    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({

          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }

        })
      }
    );


    const data = await response.json();


    if (!response.ok) {

      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        success: false,
        message: "Gemini API request failed.",
        error: data
      });

    }


    let text = "";


    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {

      text = data.candidates[0].content.parts[0].text;

    }


    if (!text) {

      return res.status(500).json({
        success: false,
        message: "Gemini returned an empty response."
      });

    }


    text = text.trim();


    /* Remove accidental markdown if Gemini returns it */

    if (text.startsWith("json")) {
      text = text.replace(/^json/, "");
      text = text.replace(/$/, "");
      text = text.trim();
    }

    if (text.startsWith("")) {
      text = text.replace(/^/, "");
      text = text.replace(/$/, "");
      text = text.trim();
    }


    let result;


    try {

      result = JSON.parse(text);

    } catch (parseError) {

      console.error("JSON Parse Error:", parseError);
      console.error("Gemini Text:", text);

      return res.status(500).json({
        success: false,
        message: "Gemini returned invalid JSON."
      });

    }


    if (
      !result.questions ||
      !Array.isArray(result.questions)
    ) {

      return res.status(500).json({
        success: false,
        message: "Invalid question format received from Gemini."
      });

    }


    if (result.questions.length !== 20) {

      return res.status(500).json({
        success: false,
        message:
          "Gemini generated " +
          result.questions.length +
          " questions instead of exactly 20."
      });

    }


    /* Validate every question */

    for (let i = 0; i < result.questions.length; i++) {

      const q = result.questions[i];


      if (!q.question) {

        return res.status(500).json({
          success: false,
          message: "Question " + (i + 1) + " is missing question text."
        });

      }


      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4
      ) {

        return res.status(500).json({
          success: false,
          message:
            "Question " +
            (i + 1) +
            " does not contain exactly 4 options."
        });

      }


      if (
        typeof q.answer !== "number" ||
        q.answer < 0 ||
        q.answer > 3
      ) {

        return res.status(500).json({
          success: false,
          message:
            "Question " +
            (i + 1) +
            " has an invalid answer."
        });

      }


      if (!q.category) {
        q.category = "General";
      }


      if (!q.difficulty) {
        q.difficulty = "Medium";
      }

    }


    console.log(
      "Generated 20 questions for:",
      name
    );

    console.log(
      "Course:",
      course
    );

    console.log(
      "Skills:",
      skills
    );


    return res.json({
      success: true,
      questions: result.questions
    });


  } catch (error) {

    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message
    });

  }

});


/* =========================
   START SERVER
========================= */

app.listen(PORT, function () {

  console.log(
    "Skillchek AI Server running at http://localhost:" + PORT
  );

});