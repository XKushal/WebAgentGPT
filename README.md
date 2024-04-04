
# WebAgentGPT

Welcome to **WebAgentGPT**, a powerful AI agent designed to navigate your personal browser. It interacts with you, performing tasks according to your instructions with precision and efficiency.

## Features

WebAgentGPT brings a suite of functionalities aimed at enhancing your productivity and online interaction experience:

- **Browser Automation**: Automatically opens and controls your browser to carry out tasks.
- **Interactive Communication**: Engages in interactive communication with you to understand and execute tasks.
- **Google Searches**: Performs Google searches based on your specific instructions.
- **Session Storage**: Maintains the session of the current browser to preserve context and continuity. This is especially crucial as GPT-4 and other large language models (LLMs) do not directly support login or user-specific feature modifications. To circumvent this, WebAgentGPT can:
  - Take screenshots of the page to monitor ongoing activities.
  - Highlight all links within the page for easy identification.
  - Click on necessary links as per your instructions.

## Getting Started

To run WebAgentGPT on your machine, follow the steps below for a smooth setup and execution process.

### Prerequisites

Ensure you have the following prerequisites installed and set up on your system:

- **Node.js**: Verify by running `node -v` in your terminal. This checks if Node.js is installed and displays the version.

### Installation

1. **Clone the Repository**: Begin by cloning this repository to your local machine.

    ```
    git clone <repository-url>
    ```

2. **Install Dependencies**: Navigate to the cloned repository and install the required dependencies.

    ```
    npm install puppeteer-extra puppeteer-extra-plugin-stealth openai fs dotenv
    ```

3. **Environment Variables**: Create a `.env` file in the root directory of the project. Add your OpenAI API key as shown below:

    ```
    OPENAI_API_KEY="your_openai_api_key_here"
    ```

### Running WebAgentGPT

After setting up, you can easily run WebAgentGPT with the following command:

```
node web_agent.js
```

By following these steps, you will be able to run WebAgentGPT and start interacting with the web agent efficiently.

Enjoy the journey with WebAgentGPT as it simplifies your online interactions and tasks!
