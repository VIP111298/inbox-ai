import { useEffect, useState } from "react";
import "./App.css";
import {
  Sparkles,
  Mail,
  AlertCircle,
  Bot,
  Send,
  ChevronRight,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Newspaper,
  Megaphone,
  LayoutGrid,
  Moon,
  Sun
} from "lucide-react";

const API = "http://127.0.0.1:8000";

function App() {
  const [email, setEmail] = useState({
    sender: "",
    subject: "",
    body: ""
  });

  const [analysis, setAnalysis] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const [question, setQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedEmail, setSelectedEmail] = useState(null);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("inboxai-theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem(
      "inboxai-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    checkGmail();
  }, []);

  async function checkGmail() {
    try {
      const response = await fetch(`${API}/gmail/status`);
      const data = await response.json();

      setGmailConnected(data.connected);

      if (data.connected) {
        loadInbox();
      }
    } catch (error) {
      console.error("Gmail status error:", error);
    }
  }

  async function connectGmail() {
    try {
      const response = await fetch(`${API}/auth/login`);
      const data = await response.json();

      window.location.href = data.authorization_url;
    } catch (error) {
      console.error("Gmail connection error:", error);
      alert("Unable to connect Gmail.");
    }
  }

  async function loadInbox() {
    setLoadingInbox(true);

    try {
      const response = await fetch(`${API}/analyze-inbox`);
      const data = await response.json();

      if (data.connected) {
        setGmailConnected(true);
        setInbox(data.emails || []);

        if (data.emails && data.emails.length > 0) {
          const first = data.emails[0];

          setEmail({
            sender: first.sender,
            subject: first.subject,
            body: first.body
          });

          setAnalysis(first.analysis);
        }
      }
    } catch (error) {
      console.error("Inbox loading error:", error);
    } finally {
      setLoadingInbox(false);
    }
  }

  async function analyzeEmail() {
    if (!email.sender && !email.subject && !email.body) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(email)
      });

      const data = await response.json();

      setAnalysis(data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function askGroqBot() {
    if (!question.trim()) {
      return;
    }

    if (inbox.length === 0) {
      setChatAnswer(
        "Please connect Gmail and analyze your inbox first."
      );
      return;
    }

    setChatLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          emails: inbox
        })
      });

      const data = await response.json();

      setChatAnswer(data.answer);
    } catch (error) {
      console.error("GroqBot error:", error);

      setChatAnswer(
        "Something went wrong while talking to GroqBot."
      );
    } finally {
      setChatLoading(false);
    }
  }

  function openEmail(item) {
    setSelectedEmail(item);

    setEmail({
      sender: item.sender,
      subject: item.subject,
      body: item.body
    });

    setAnalysis(item.analysis);
  }

  function scrollToSection(id) {
    const section = document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function goToDashboard() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    setSelectedCategory("All");
  }

  const needsAttention = inbox.filter(
    item => item.analysis?.requires_action
  ).length;

  const importantEmails = inbox.filter(
    item => (item.analysis?.importance || 0) >= 0.7
  ).length;

  const categories = [
    {
      name: "All",
      icon: LayoutGrid,
      count: inbox.length
    },
    {
      name: "Career",
      icon: Briefcase,
      count: inbox.filter(
        item => item.analysis?.category === "Career"
      ).length
    },
    {
      name: "College",
      icon: GraduationCap,
      count: inbox.filter(
        item => item.analysis?.category === "College"
      ).length
    },
    {
      name: "Finance",
      icon: Wallet,
      count: inbox.filter(
        item => item.analysis?.category === "Finance"
      ).length
    },
    {
      name: "Work",
      icon: Briefcase,
      count: inbox.filter(
        item => item.analysis?.category === "Work"
      ).length
    },
    {
      name: "Security",
      icon: ShieldAlert,
      count: inbox.filter(
        item => item.analysis?.category === "Security"
      ).length
    },
    {
      name: "OTP",
      icon: ShieldCheck,
      count: inbox.filter(
        item => item.analysis?.category === "OTP"
      ).length
    },
    {
      name: "Newsletter",
      icon: Newspaper,
      count: inbox.filter(
        item => item.analysis?.category === "Newsletter"
      ).length
    },
    {
      name: "Promotion",
      icon: Megaphone,
      count: inbox.filter(
        item => item.analysis?.category === "Promotion"
      ).length
    }
  ];

  const filteredInbox =
    selectedCategory === "All"
      ? inbox
      : inbox.filter(
          item =>
            item.analysis?.category === selectedCategory
        );

  const attentionEmails = inbox.filter(
    item => item.analysis?.requires_action
  );

  return (
    <div className={darkMode ? "app dark-mode" : "app"}>
      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={21} />
          </div>

          <div>
            <strong>InboxAI</strong>

            <small>
              AI Email Intelligence
            </small>
          </div>
        </div>

        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <Sun size={17} />
          ) : (
            <Moon size={17} />
          )}

          <span>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        <div
          className="nav active"
          onClick={goToDashboard}
        >
          <Mail size={18} />
          Dashboard
        </div>

        <div
          className="nav"
          onClick={() =>
            scrollToSection("attention-section")
          }
        >
          <AlertCircle size={18} />
          Needs Attention
        </div>

        <div
          className="nav"
          onClick={() =>
            scrollToSection("groq-section")
          }
        >
          <Bot size={18} />
          GroqBot
        </div>

      </aside>

      <main>

        <header>
          <div>
            <h1>
              {new Date().getHours() < 12
                ? "Good morning"
                : new Date().getHours() < 18
                  ? "Good afternoon"
                  : "Good evening"}{" "}
              👋
            </h1>

            <p>
              Let AI understand your inbox.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px"
            }}
          >
            {gmailConnected && (
              <button
                className="connect"
                onClick={loadInbox}
                disabled={loadingInbox}
              >
                <RefreshCw size={16} />

                {loadingInbox
                  ? "Analyzing..."
                  : "Refresh Inbox"}
              </button>
            )}

            <button
              className="connect"
              onClick={connectGmail}
            >
              <Mail size={16} />

              {gmailConnected
                ? "Gmail Connected"
                : "Connect Gmail"}
            </button>
          </div>
        </header>

        <div className="stats">

          <div className="stat">
            <Mail />

            <div>
              <small>
                Emails analyzed
              </small>

              <strong>
                {inbox.length}
              </strong>
            </div>
          </div>

          <div className="stat">
            <AlertCircle />

            <div>
              <small>
                Needs attention
              </small>

              <strong>
                {needsAttention}
              </strong>
            </div>
          </div>

          <div className="stat">
            <Sparkles />

            <div>
              <small>
                Important
              </small>

              <strong>
                {importantEmails}
              </strong>
            </div>
          </div>

        </div>

        <section
          id="groq-section"
          className="groq"
        >

          <div className="groq-heading">

            <div className="bot-icon">
              <Bot />
            </div>

            <div>
              <h2>
                Ask GroqBot
              </h2>

              <p>
                Your intelligent inbox assistant
              </p>
            </div>

          </div>

          <div className="chat">

            <input
              value={question}
              onChange={e =>
                setQuestion(e.target.value)
              }
              onKeyDown={e => {
                if (e.key === "Enter") {
                  askGroqBot();
                }
              }}
              placeholder="Ask about your inbox..."
            />

            <button
              onClick={askGroqBot}
              disabled={chatLoading}
            >
              {chatLoading ? (
                "..."
              ) : (
                <Send size={18} />
              )}
            </button>

          </div>

          {chatAnswer && (
            <div className="chat-answer">

              <Bot size={18} />

              <p>
                {chatAnswer}
              </p>

            </div>
          )}

          <div className="suggestions">

            <button
              onClick={() => {
                setQuestion(
                  "What needs my attention?"
                );

                setTimeout(
                  askGroqBot,
                  50
                );
              }}
            >
              What needs my attention?
            </button>

            <button
              onClick={() => {
                setQuestion(
                  "Show my career emails"
                );

                setTimeout(
                  askGroqBot,
                  50
                );
              }}
            >
              Career emails
            </button>

            <button
              onClick={() => {
                setQuestion(
                  "Which emails need a reply?"
                );

                setTimeout(
                  askGroqBot,
                  50
                );
              }}
            >
              Emails needing reply
            </button>

            <button
              onClick={() => {
                setQuestion(
                  "Which emails have deadlines?"
                );

                setTimeout(
                  askGroqBot,
                  50
                );
              }}
            >
              Emails with deadlines
            </button>

          </div>

        </section>

        <section className="content-grid">

          <div className="panel">

            <div className="panel-title">

              <div>
                <h2>
                  Analyze Email
                </h2>

                <p>
                  See what actually matters.
                </p>
              </div>

              <Sparkles />

            </div>

            <input
              value={email.sender}
              onChange={e =>
                setEmail({
                  ...email,
                  sender: e.target.value
                })
              }
              placeholder="Sender"
            />

            <input
              value={email.subject}
              onChange={e =>
                setEmail({
                  ...email,
                  subject: e.target.value
                })
              }
              placeholder="Subject"
            />

            <textarea
              value={email.body}
              onChange={e =>
                setEmail({
                  ...email,
                  body: e.target.value
                })
              }
              placeholder="Email body"
            />

            <button
              className="analyze-btn"
              onClick={analyzeEmail}
              disabled={loading}
            >

              <Sparkles size={18} />

              {loading
                ? "Analyzing with Groq..."
                : "Analyze with GroqBot"}

            </button>

          </div>

          <div className="panel">

            <div className="panel-title">

              <div>
                <h2>
                  AI Intelligence
                </h2>

                <p>
                  Extracted from the email
                </p>
              </div>

              <Bot />

            </div>

            {!analysis ? (

              <div className="empty">

                <Sparkles size={30} />

                <p>
                  Connect Gmail to analyze
                  your inbox with AI.
                </p>

              </div>

            ) : (

              <>
                <div className="result-summary">

                  <strong>
                    {analysis.summary}
                  </strong>

                  <p>
                    {analysis.reason}
                  </p>

                </div>

                <div className="result-grid">

                  <Result
                    label="Category"
                    value={analysis.category}
                  />

                  <Result
                    label="Subcategory"
                    value={analysis.subcategory}
                  />

                  <Result
                    label="Importance"
                    value={`${Math.round(
                      (analysis.importance || 0) * 100
                    )}%`}
                  />

                  <Result
                    label="Action"
                    value={analysis.action}
                  />

                  <Result
                    label="Deadline"
                    value={
                      analysis.deadline ||
                      "None"
                    }
                  />

                  <Result
                    label="Amount"
                    value={
                      analysis.amount
                        ? `₹${analysis.amount}`
                        : "None"
                    }
                  />

                  <Result
                    label="Action Required"
                    value={
                      analysis.requires_action
                        ? "YES"
                        : "NO"
                    }
                  />

                </div>
              </>
            )}

          </div>

        </section>

        <section
          id="attention-section"
          className="attention"
          onClick={() =>
            scrollToSection(
              "action-required-section"
            )
          }
        >

          <div>

            <AlertCircle />

            <div>

              <h2>
                What needs my attention?
              </h2>

              <p>
                {needsAttention > 0
                  ? `${needsAttention} emails may require your action.`
                  : "No emails currently require your action."}
              </p>

            </div>

          </div>

          <ChevronRight />

        </section>

        {attentionEmails.length > 0 && (

          <section
            id="action-required-section"
            className="panel"
          >

            <div className="panel-title">

              <div>

                <h2>
                  Action Required
                </h2>

                <p>
                  Emails that may need your response.
                </p>

              </div>

              <AlertCircle />

            </div>

            <div className="email-list">

              {attentionEmails.map(item => (

                <div
                  className="email-item"
                  key={item.id}
                  onClick={() =>
                    openEmail(item)
                  }
                >

                  <div className="email-main">

                    <strong>
                      {item.subject ||
                        "(No subject)"}
                    </strong>

                    <small>
                      {item.sender}
                    </small>

                  </div>

                  <div className="email-meta">

                    <span className="category-badge">
                      {item.analysis?.category ||
                        "Other"}
                    </span>

                    <span className="action-badge">
                      {item.analysis?.action ||
                        "REVIEW"}
                    </span>

                  </div>

                  <p>
                    {item.analysis?.summary ||
                      "No summary available."}
                  </p>

                </div>

              ))}

            </div>

          </section>

        )}

        <section className="panel">

          <div className="panel-title">

            <div>

              <h2>
                Smart Inbox
              </h2>

              <p>
                AI-organized emails from Gmail
              </p>

            </div>

            <Sparkles />

          </div>

          <div className="category-list">

            {categories.map(category => {

              const Icon = category.icon;

              return (

                <button
                  key={category.name}
                  className={
                    selectedCategory === category.name
                      ? "category active"
                      : "category"
                  }
                  onClick={() =>
                    setSelectedCategory(
                      category.name
                    )
                  }
                >

                  <Icon size={17} />

                  <span>
                    {category.name}
                  </span>

                  <strong>
                    {category.count}
                  </strong>

                </button>

              );

            })}

          </div>

          {filteredInbox.length === 0 ? (

            <div className="empty">

              <Mail size={30} />

              <p>
                {inbox.length === 0
                  ? "Connect Gmail to see your emails."
                  : "No emails in this category."}
              </p>

            </div>

          ) : (

            <div className="email-list">

              {filteredInbox.map(item => (

                <div
                  className="email-item"
                  key={item.id}
                  onClick={() =>
                    openEmail(item)
                  }
                >

                  <div className="email-main">

                    <strong>
                      {item.subject ||
                        "(No subject)"}
                    </strong>

                    <small>
                      {item.sender}
                    </small>

                  </div>

                  <div className="email-meta">

                    <span className="category-badge">
                      {item.analysis?.category ||
                        "Other"}
                    </span>

                    {item.analysis?.requires_action && (

                      <span className="action-badge">
                        Action Required
                      </span>

                    )}

                  </div>

                  <p>
                    {item.analysis?.summary ||
                      "No summary available."}
                  </p>

                </div>

              ))}

            </div>

          )}

        </section>

        {selectedEmail && (

          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedEmail(null)
            }
          >

            <div
              className="email-modal"
              onClick={e =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>

                  <span className="modal-label">
                    AI EMAIL ANALYSIS
                  </span>

                  <h2>
                    {selectedEmail.subject ||
                      "(No subject)"}
                  </h2>

                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setSelectedEmail(null)
                  }
                >
                  ×
                </button>

              </div>

              <div className="modal-sender">

                <Mail size={17} />

                <div>

                  <strong>
                    {selectedEmail.sender}
                  </strong>

                  <span>
                    Gmail message
                  </span>

                </div>

              </div>

              <div className="modal-section">

                <h3>
                  Email
                </h3>

                <div className="email-body">

                  {selectedEmail.body ||
                    "No email content available."}

                </div>

              </div>

              <div className="modal-section">

                <h3>
                  Groq Intelligence
                </h3>

                <div className="modal-summary">

                  <strong>
                    {selectedEmail.analysis?.summary ||
                      "No summary available."}
                  </strong>

                  <p>
                    {selectedEmail.analysis?.reason ||
                      "No reason available."}
                  </p>

                </div>

                <div className="modal-analysis-grid">

                  <div>

                    <small>
                      Category
                    </small>

                    <strong>
                      {selectedEmail.analysis?.category ||
                        "Other"}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Importance
                    </small>

                    <strong>
                      {Math.round(
                        (selectedEmail.analysis?.importance ||
                          0) * 100
                      )}%
                    </strong>

                  </div>

                  <div>

                    <small>
                      Recommended Action
                    </small>

                    <strong>
                      {selectedEmail.analysis?.action ||
                        "NONE"}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Deadline
                    </small>

                    <strong>
                      {selectedEmail.analysis?.deadline ||
                        "None"}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Amount
                    </small>

                    <strong>
                      {selectedEmail.analysis?.amount
                        ? `₹${selectedEmail.analysis.amount}`
                        : "None"}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Action Required
                    </small>

                    <strong>
                      {selectedEmail.analysis?.requires_action
                        ? "YES"
                        : "NO"}
                    </strong>

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

      </main>
    </div>
  );
}

function Result({ label, value }) {
  return (
    <div className="result">

      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>

    </div>
  );
}

export default App;