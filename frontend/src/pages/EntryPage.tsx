import "../App.css";
import backgroundImage from "../assets/images/CoralSCOP_Homepage.jpg";
import titleImage from "../assets/images/home-title.svg";
import { useNavigate } from "react-router-dom";

function EntryPage() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <img className="bg" src={backgroundImage} alt="" />
      <div className="home__content">
        <div>
          <img className="title" src={titleImage} alt="" />
          <p>Segment any coral in the images.</p>
          <div className="button-row">
            <button
              id="create-project-button"
              className="button"
              onClick={() => navigate("/project-creation")}
            >
              Create New Project
            </button>
            <button
              className="button button--border"
              id="load-project-button"
              onClick={() => navigate("/project-annotation")}
            >
              Load Existing Project
            </button>
            <button
              className="button button--border"
              id="quick-start-button"
              onClick={() => navigate("/project-quick-start")}
            >
              Quick Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntryPage;
