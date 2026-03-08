# **Imperium: UX/UI Design Specification**

## **1\. Design Language & Visual Identity**

* **Density:** Default "Compact Mode." Tight line-heights and reduced margins to maximize visibility of code, logs, and complex configurations.

## **2\. Main Application Layout (Shell)**

### **A. The Primary Sidebar (Left \- Condensed)**

* **Top Section (Workspaces):**  
  * \[+\] Small, square action button for New Project.  
  * Vertical list of Project IDs with status indicators (2px border color: Green=Idle, Blue=Executing, Amber=Suspended).  
* **Bottom Section (Global Control):**  
  * **Global Skills & MCPs:** A dedicated management view to install/configure tools available to *all* projects (e.g., a master Google Drive MCP or a primary Email tool).  
  * **Global Connections:** Manage the "Master" Discord/Telegram bot tokens.  
  * **System Status:** Tailscale status, Caffeinate toggle, and a 4px "Total Burn" progress bar for global spend.

### **B. The Project Workspace (Center \- Max Width)**

1. **Overview Tab (Config):**  
   * **Project Meta:** Name, Local Path, and Description (Small-text fields).  
   * **Social Integration Table:** \* **Toggle:** On/Off switch per channel.  
     * **Channel Selector:** Dropdown showing "Channel Name" (System uses ID) fetched from the Global Connection metadata. Manual ID input (comma-sep) available for unindexed channels.  
     * **Mode Selector:** Segmented control for Reply All, Reply on Mention, and Read Only.  
   * **Security Profile:** **Mad Max / Praetorian / Imperator** tiers.  
2. **Omni-Chat Tab:**  
   * **Vertical Threads:** Thin list on the far left.  
   * **Chat Log:** Flat, compact rows with initials. Inline cost tags (0.002¢) with low-opacity by default.  
   * **Task-ify:** Highlight text to convert into a Kanban card.  
3. **Kanban Board Tab (The Action):**  
   * **Layout:** 4 high-density columns.  
   * **Card Header:** Assignment toggle (AI vs. Human).  
   * **Action:** A prominent "Launch" button on AI-assigned cards to initiate execution.  
   * **Comment Drawer (Context-Rich):** \* **AI Progress Logs:** Real-time stream of what the AI is doing (e.g., Reading File X, Replacing line 45...).  
     * **Human-AI Chat:** Both can post comments. The AI utilizes the specific card state \+ project files as its active context.  
4. **Skills & MCPs Tab (Project Silos):**  
   * **Inherited Tools:** List of Global Skills toggled "On" for this project.  
   * **Project-Specific Box:** Section to add MCPs/Skills that *only* exist for this project (e.g., a specific project-only Email MCP). These are independent boxes that do not leak data to other projects.

## **3\. Key Components & Interactions**

### **The "Execution Feed" (Kanban Card)**

* **Visual:** A terminal-like mini-window within the card comment area.  
* **Function:** Shows raw progress logs from the CLI bridge. Allows the user to "Review Work" by clicking diff-links generated during the AI's task.

### **Social Mode Logic**

* **Reply All:** AI monitors the channel and responds to all messages as they arrive.  
* **Reply on Mention:** AI only wakes up when its @bot\_name or a specific project keyword is used.  
* **Read Only:** AI logs the conversation into the project memory but never sends an outbound message.

### **Global vs. Local Skills**

* **Global Settings:** Accessed from the main sidebar. Used for "Core" capabilities (e.g., general file management).  
* **Project Settings:** Accessed within the project tab. Used for "Specific" capabilities (e.g., a dedicated Discord bot for just this repo).

## **4\. UI Design Roadmap**

1. **Two-Tier Registry:** Building the logic to distinguish between Global tools (in sidebar) and Project-specific tools (in workspace).  
2. **Card Comment Engine:** Developing the context-aware chat specifically for Kanban tasks.  
3. **Dynamic Channel Dropdown:** Implementing a metadata fetcher for Discord/Telegram so users see names instead of IDs.  
4. **macOS-First Menu Bar:** Quick toggle for Caffeinate mode and active project status.