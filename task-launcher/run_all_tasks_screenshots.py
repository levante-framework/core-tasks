#!/usr/bin/env python3
"""
Comprehensive script to capture screenshots for all available tasks
and process them with OCR-based cleanup.
"""

import os
import sys
import subprocess
import time
import json
from pathlib import Path
from typing import List, Dict

# Task mapping from taskConfig.ts to URL parameters
TASKS = {
    'egma-math': 'egmaMath',
    'matrix-reasoning': 'matrixReasoning', 
    'mental-rotation': 'mentalRotation',
    'hearts-and-flowers': 'heartsAndFlowers',
    'memory-game': 'memoryGame',
    'same-different-selection': 'sameDifferentSelection',
    'trog': 'trog',
    'vocab': 'vocab',
    'theory-of-mind': 'theoryOfMind',
    'intro': 'intro',
    'roar-inference': 'roarInference',
    'adult-reasoning': 'adultReasoning'
}

def create_task_test(task_url_param: str, task_name: str) -> str:
    """Create a Cypress test file for a specific task."""
    test_content = f'''const {task_name.replace('-', '_')}_url = 'http://localhost:8080/?task={task_url_param}';

describe('{task_name.title().replace("-", " ")} Complete Run', () => {{
  let screenshotCounter = 1;

  function takeScreenshot(description) {{
    cy.screenshot(`${{screenshotCounter.toString().padStart(3, '0')}}-${{description}}`);
    screenshotCounter++;
  }}

  it('runs complete {task_name.replace("-", " ")} with screenshots', () => {{
    // Visit with fullscreen mocking and extended timeout
    cy.visit({task_name.replace('-', '_')}_url, {{
      timeout: 60000,
      onBeforeLoad: (win) => {{
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {{
          get: () => win.document.documentElement
        }});
        Object.defineProperty(win.document, 'fullscreenEnabled', {{
          get: () => true
        }});
      }}
    }});

    // Initial screenshot
    takeScreenshot('initial-load');
    
    // Run for 4 minutes with screenshots every 10 seconds
    const totalDuration = 4 * 60 * 1000; // 4 minutes
    const screenshotInterval = 10 * 1000; // 10 seconds
    const numScreenshots = Math.floor(totalDuration / screenshotInterval);
    
    // Take screenshots at regular intervals
    for (let i = 1; i <= numScreenshots; i++) {{
      cy.wait(screenshotInterval);
      takeScreenshot(`interval-${{i.toString().padStart(2, '0')}}`);
      
      // Try to interact with common elements (non-blocking)
      cy.get('body').then(($body) => {{
        // Click OK buttons if they exist
        if ($body.find('button:contains("OK")').length > 0) {{
          cy.get('button:contains("OK")').first().click({{ force: true }});
        }}
        // Click Continue buttons if they exist  
        if ($body.find('button:contains("Continue")').length > 0) {{
          cy.get('button:contains("Continue")').first().click({{ force: true }});
        }}
        // Click Next buttons if they exist
        if ($body.find('button:contains("Next")').length > 0) {{
          cy.get('button:contains("Next")').first().click({{ force: true }});
        }}
        // Click Start buttons if they exist
        if ($body.find('button:contains("Start")').length > 0) {{
          cy.get('button:contains("Start")').first().click({{ force: true }});
        }}
        // Click any visible buttons as fallback
        if ($body.find('button:visible').length > 0) {{
          cy.get('button:visible').first().click({{ force: true }});
        }}
      }});
    }}
    
    // Final screenshot
    takeScreenshot('final-state');
  }});
}});
'''
    return test_content

def start_dev_server():
    """Start the webpack dev server."""
    print("🚀 Starting webpack dev server...")
    
    # Kill any existing processes on port 8080
    try:
        subprocess.run(['pkill', '-f', 'webpack serve'], capture_output=True)
        subprocess.run(['pkill', '-f', 'port 8080'], capture_output=True)
        time.sleep(2)
    except:
        pass
    
    # Start dev server in background
    server_process = subprocess.Popen([
        'npx', 'webpack', 'serve', 
        '--mode', 'development', 
        '--env', 'dbmode=development', 
        '--port', '8080'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to start
    print("⏳ Waiting for dev server to start...")
    time.sleep(15)
    
    return server_process

def run_task_test(task_url_param: str, task_name: str) -> bool:
    """Run Cypress test for a specific task."""
    print(f"\n📸 Running screenshots for: {task_name}")
    
    # Create test file
    test_filename = f"cypress/e2e/{task_name.replace('-', '_')}_complete.cy.js"
    test_content = create_task_test(task_url_param, task_name)
    
    with open(test_filename, 'w') as f:
        f.write(test_content)
    
    # Run Cypress test
    try:
        result = subprocess.run([
            'npx', 'cypress', 'run', 
            '--spec', test_filename,
            '--record', 'false'
        ], capture_output=True, text=True, timeout=300)  # 5 minute timeout
        
        if result.returncode == 0:
            print(f"✅ {task_name} screenshots completed successfully")
            return True
        else:
            print(f"⚠️  {task_name} test completed with warnings")
            print(f"   Output: {result.stdout[-200:]}")  # Last 200 chars
            return True  # Still consider it successful for screenshots
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {task_name} test timed out after 5 minutes")
        return False
    except Exception as e:
        print(f"❌ {task_name} test failed: {e}")
        return False

def cleanup_screenshots(task_name: str) -> Dict:
    """Run OCR cleanup on screenshots for a task."""
    screenshot_dir = f"cypress/screenshots/{task_name.replace('-', '_')}_complete.cy.js"
    
    if not os.path.exists(screenshot_dir):
        print(f"⚠️  No screenshots found for {task_name}")
        return {"status": "no_screenshots"}
    
    print(f"🔍 Running OCR cleanup for {task_name}...")
    
    try:
        # Run OCR cleanup
        result = subprocess.run([
            'python3', 'cleanup_screenshots_ocr.py', 
            screenshot_dir, '--execute'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            # Parse the output to get statistics
            output_lines = result.stdout.strip().split('\n')
            stats = {}
            for line in output_lines:
                if 'Total screenshots:' in line:
                    stats['total'] = int(line.split(':')[1].strip())
                elif 'Unique groups:' in line:
                    stats['unique'] = int(line.split(':')[1].strip())
                elif 'Duplicates removed:' in line:
                    stats['removed'] = int(line.split(':')[1].strip())
            
            print(f"✅ {task_name} cleanup complete: {stats.get('unique', '?')} unique from {stats.get('total', '?')} total")
            return {"status": "success", "stats": stats}
        else:
            print(f"⚠️  {task_name} cleanup had issues: {result.stderr}")
            return {"status": "partial", "error": result.stderr}
    
    except Exception as e:
        print(f"❌ {task_name} cleanup failed: {e}")
        return {"status": "failed", "error": str(e)}

def main():
    """Main execution function."""
    print("🎯 COMPREHENSIVE TASK SCREENSHOT CAPTURE")
    print("=" * 50)
    
    # Change to task-launcher directory
    os.chdir('task-launcher')
    
    # Start dev server
    server_process = start_dev_server()
    
    results = {}
    successful_tasks = []
    failed_tasks = []
    
    try:
        # Process each task
        for task_url_param, task_config_name in TASKS.items():
            print(f"\n{'='*20} {task_url_param.upper()} {'='*20}")
            
            # Run screenshot capture
            success = run_task_test(task_url_param, task_url_param)
            
            if success:
                # Run OCR cleanup
                cleanup_result = cleanup_screenshots(task_url_param)
                results[task_url_param] = {
                    "screenshots": "success",
                    "cleanup": cleanup_result
                }
                successful_tasks.append(task_url_param)
            else:
                results[task_url_param] = {
                    "screenshots": "failed",
                    "cleanup": {"status": "skipped"}
                }
                failed_tasks.append(task_url_param)
            
            # Small delay between tasks
            time.sleep(3)
    
    finally:
        # Stop dev server
        print("\n🛑 Stopping dev server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
    
    # Generate summary report
    print(f"\n{'='*50}")
    print("📊 FINAL SUMMARY REPORT")
    print(f"{'='*50}")
    
    print(f"✅ Successful tasks ({len(successful_tasks)}):")
    for task in successful_tasks:
        stats = results[task].get("cleanup", {}).get("stats", {})
        unique = stats.get("unique", "?")
        total = stats.get("total", "?")
        print(f"   • {task}: {unique} unique screenshots from {total} total")
    
    if failed_tasks:
        print(f"\n❌ Failed tasks ({len(failed_tasks)}):")
        for task in failed_tasks:
            print(f"   • {task}")
    
    # Save detailed results
    with open('task_screenshot_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: task_screenshot_results.json")
    print(f"🎉 Task screenshot capture complete!")
    
    return len(successful_tasks), len(failed_tasks)

if __name__ == "__main__":
    successful, failed = main()
    sys.exit(0 if failed == 0 else 1) 