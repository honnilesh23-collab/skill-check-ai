const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// SAME MODEL — NO MODEL CHANGE
const MODEL = "gemini-3.5-flash-lite";

app.get("/", function (req, res) {
  res.json({
    success: true,
    message: "Skillchek AI Server is running"
  });
});

app.post("/api/generate-assessment", async function (req, res) {
  try {
    const candidate = req.body || {};

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

    const prompt = `Create an AI competency assessment.

Candidate:
Education: ${education}
Course: ${course}
Experience: ${experience}
Target Role: ${role}
Skills: ${skills}

Generate EXACTLY 20 unique multiple-choice competency questions based strongly on the course, role and skills.

Requirements:
- Exactly 20 questions
- Exactly 4 options per question
- Exactly 1 correct answer
- Mix Easy, Medium and Difficult
- Cover the selected skills
- Prefer practical competency questions
- No explanations
- No markdown

Return ONLY valid JSON:

{"questions":[{"question":"Question text","options":["A","B","C","D"],"answer":0,"category":"Skill name","difficulty":"Easy"}]}

answer must be 0, 1, 2 or 3.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing in .env file."
      });
    }

    const response = await fetch(
      https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent,
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
            responseMimeType: "application/json",

            // SPEED OPTIMIZATION
            thinkingConfig: {
              thinkingLevel: "minimal"
            },

            // Enough for 20 MCQs while avoiding unnecessary output
            maxOutputTokens: 4500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        success: false,
        message: "Gemini API request failed."
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!text) {
      return res.status(500).json({
        success: false,
        message: "Gemini returned an empty response."
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("JSON Parse Error:", error);

      return res.status(500).json({
        success: false,
        message: "Gemini returned invalid JSON."
      });
    }

    if (
      !Array.isArray(result.questions) ||
      result.questions.length !== 20
    ) {
      return res.status(500).json({
        success: false,
        message: "Gemini did not return exactly 20 questions."
      });
    }

    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];

      if (
        !q ||
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.answer !== "number" ||
        q.answer < 0 ||
        q.answer > 3
      ) {
        return res.status(500).json({
          success: false,
          message: Question ${i + 1} has an invalid format.
        });
      }

      if (!q.category) {
        q.category = "General";
      }

      if (!q.difficulty) {
        q.difficulty = "Medium";
      }
    }

    console.log("Generated 20 questions for:", name);
    console.log("Course:", course);
    console.log("Skills:", skills);

    return res.json({
      success: true,
      questions: result.questions
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});

app.listen(PORT, function () {
  console.log(Skillchek AI Server running on port ${PORT});
});
