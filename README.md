# Photo Editor Website

This project is a simple JavaScript-based website that displays a "Hello World" message. It is structured to be easily deployed to GitHub Pages.

## Project Structure

```
photoedit
├── index.html          # Main HTML document
├── src
│   └── main.js        # JavaScript code for the website
├── .github
│   └── workflows
│       └── deploy.yml # GitHub Actions workflow for deployment
├── package.json       # npm configuration file
└── README.md          # Project documentation
```

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd photoedit
   ```

2. **Install dependencies:**
   If there are any dependencies listed in `package.json`, install them using npm:
   ```bash
   npm install
   ```

3. **Run the project:**
   Open `index.html` in your web browser to view the website.

## Deploying to GitHub Pages

This project is set up to be deployed to GitHub Pages using GitHub Actions. The workflow file located at `.github/workflows/deploy.yml` handles the deployment process.

To deploy the website:

1. Push your changes to the `main` branch of your repository.
2. The GitHub Actions workflow will automatically build and deploy the website to GitHub Pages.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.