# AlgoCrawl

AlgoCrawl is an advanced non-headless web crawler built with [Playwright](https://playwright.dev) and TypeScript designed for comprehensive website exploration. Using a dual-depth approach, it not only follows navigational links like a traditional crawler but also simulates user interactions to capture dynamically loaded content.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Current Status & Progress Summary](#current-status--progress-summary)
- [Project Description](#project-description)
- [Roadmap & To Do](#roadmap--to-do)
- [Contributing](#contributing)
- [License](#license)

## Overview

AlgoCrawl uses a **dual-depth approach** to explore web applications:

- **Page Depth:**  
  Every navigable page (reached via links or form submissions) is analyzed. The crawler compiles interactive elements (forms, links, buttons, etc.) to create a baseline for exploration.

- **Dynamic Depth:**  
  Within each page, AlgoCrawl simulates user interactions by clicking elements and submitting forms. It monitors for dynamic DOM changes (e.g., AJAX responses or HTML5 updates) and, upon detecting any, recursively explores the updated state.

This approach makes AlgoCrawl ideal for security assessments, performance testing, and in-depth website analysis.

## Features

- **Dual-Depth Crawling:**  
  Combines traditional page crawling with in-page dynamic interaction testing.
  
- **Playwright Automation:**  
  Utilizes Playwright for efficient, headless browser automation.
  
- **Optimized Element Interaction:**  
  Supports multiple click strategies (standard, JavaScript-triggered, and position-based) to handle various types of interactive elements.
  
- **Customizable Configuration:**  
  Easily modify settings such as depth limits, timeouts, proxy configurations, and interaction toggles using JSON.
  
- **Error Resilience & Proxy Support:**  
  Comprehensive error handling and proxy configuration to navigate complex web environments.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Steps

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/AlgoCrawl.git
   cd AlgoCrawl
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

## Usage

To start the crawler, run:

```bash
npm start
```

For development mode with auto-reloading:

```bash
npm run dev
```

By default, the crawler uses the configuration in `config/default.json`. To specify a custom configuration file, pass its path as a command-line argument:

```bash
npm start path/to/yourConfig.json
```

## Configuration

Customize the crawler’s behavior via the `config/default.json` file. Key parameters include:

- **startUrl:** The initial URL to begin crawling.
- **allowedDomains:** A list of domains that the crawler is allowed to explore.
- **maxDepth & maxPagesPerDomain:** Limits to prevent endless crawling.
- **headless & timeout:** Configure the browser’s execution mode and network timeout settings.
- **interactWithForms & interactWithElements:** Toggle dynamic interaction features.
- **Proxy Settings:** Configure proxy details and HTTPS error handling.

## Current Status & Progress Summary

### Core Functionality
- ✅ Basic crawler setup with Playwright.
- ✅ Configurable options via JSON.
- ✅ Page analysis and detection of interactive elements.
- ✅ Smart element interaction using multiple click strategies.
- ✅ AJAX request handling and monitoring.
- ✅ Proxy support with SSL/HTTPS error management.

### Recent Improvements

#### AJAX Handling
- Smart tracking of AJAX requests and responses.
- Dynamic network activity monitoring.
- Detailed error and timing logs.
- Automatic retry mechanisms for failed requests.

#### Interaction System
- Multiple click strategies:
  - Standard click.
  - JavaScript-triggered click.
  - Position-based click.
- Efficient waiting mechanisms using network idle and response-based progression.
- Post-interaction analysis to detect new dynamic elements.

#### Performance Optimizations
- Removal of unnecessary fixed delays.
- Enhanced URL normalization and deduplication.
- Optimized request queue monitoring and smart timeout handling.

#### Error Handling
- Comprehensive error capture and logging.
- Detailed monitoring of connection errors and response statuses.
- Improved error recovery mechanisms.

### Current Limitations
- Single-page crawling (depth management is pending).
- Basic form interaction.
- Limited JavaScript event simulation.

## Project Description

AlgoCrawl is built around a dual-depth crawling strategy:

1. **Overall Concept:**
   - **Page Depth:**  
     Each navigable page (via links or forms) is treated as a separate unit with a baseline analysis.
   - **Dynamic Depth:**  
     Simulates user interactions on each page. Upon detecting dynamic DOM changes (via AJAX, HTML5 updates, etc.), the crawler reanalyzes the new state recursively.

2. **Crawl Process:**
   - **Initial Page Load:**  
     Opens the target URL in a headless browser, waits for the page to settle, and compiles interactive elements.
   - **Processing Forms & Links:**  
     Submits forms and follows in-scope navigational links, queuing new pages for further exploration.
   - **Simulated In-Page Interactions:**  
     Clicks every interactive element, waits for any DOM changes, and recursively explores new dynamic states.

3. **Control and Management:**
   - **Tracking and Limits:**  
     Maintains a record of visited states (using normalized snapshots or unique identifiers) to prevent redundant processing.
   - **Scoping & Filtering:**  
     Defines criteria to determine which pages or states are in-scope, avoiding redundant or out-of-scope interactions.

4. **Error Handling and Logging:**
   - Implements robust timeout, retry, and state restoration strategies.
   - Logs every interaction and outcome for auditing and debugging.

5. **Integration & Extensibility:**
   - Modular design separates the crawling engine from dynamic interaction logic.
   - Easily extensible for future additions such as vulnerability scanning and deeper content analysis.

## Roadmap & To Do

### Future Enhancements
- **Depth-First Crawling:**  
  Implement improved URL queuing and state management for deeper exploration.
  
- **Advanced Form Interaction:**  
  Enhance form handling with more sophisticated submission and validation techniques.
  
- **JavaScript Event Simulation:**  
  Improve simulation of dynamic JavaScript events beyond basic click interactions.
  
- **Concurrent Page Handling:**  
  Further optimize multi-threading with a refined worker pool management system.
  
- **Enhanced Error Recovery:**  
  Refine error tracking, recovery, and state restoration mechanisms.

### Known Issues & To Do
- **Crawling Specific Targets:**
  - **Comment Aid/PID Commenting:**  
    Improve handling for comment sections.
  - **Artist View Vulnerability:**  
    - `GET http://testphp.vulnweb.com/listproducts.php` with the 'artist' parameter is SQLi vulnerable.
  - **Product Details Vulnerability:**  
    - `GET http://testphp.vulnweb.com/Mod_Rewrite_Shop/details.php` with the 'id' parameter is SQLi vulnerable.
  - **Buy Link Issue:**  
    When refreshing the product link after clicking the buy link, a 404 error is encountered (the buy link is not correctly followed).
  - **Add to Cart Button:**  
    Implement proper handling for the "Add to Cart" functionality.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Ensure your code is modular, well-documented, and follows project guidelines.
4. Open a pull request for review.

For more details, please see our [Contribution Guidelines](CONTRIBUTING.md) (if available).

## License

AlgoCrawl is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Happy Crawling!
```

---

Feel free to adjust any sections to better match your project’s specifics or evolving requirements. This `README.md` offers a structured overview that includes core concepts, current progress, future plans, and contribution guidelines—all key elements for a successful GitHub project page.
