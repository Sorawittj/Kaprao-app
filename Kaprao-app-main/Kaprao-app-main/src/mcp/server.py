#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max MCP Server - Model Context Protocol server for direct tool integration.

This server exposes the UI/UX Pro Max search and design system generation
as MCP tools that can be called directly by AI assistants.

Usage:
    python src/mcp/server.py
    
Configuration (add to MCP settings):
    {
        "mcpServers": {
            "ui-ux-pro-max": {
                "command": "python",
                "args": ["src/mcp/server.py"],
                "cwd": "<project-root>"
            }
        }
    }
"""

import sys
import json
import io
from pathlib import Path

# Add src/scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from core import search, search_stack, detect_domain, detect_tech_stack, AVAILABLE_STACKS, CSV_CONFIG
from design_system import generate_design_system
from export import export_tailwind_config, export_css_variables, export_design_tokens, _generate_dark_palette
from review import review_code

# Force UTF-8
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# ============ MCP PROTOCOL ============
def send_response(response: dict):
    """Send JSON-RPC response to stdout."""
    msg = json.dumps(response, ensure_ascii=False)
    sys.stdout.write(f"Content-Length: {len(msg.encode('utf-8'))}\r\n\r\n{msg}")
    sys.stdout.flush()


def send_error(id, code: int, message: str):
    """Send JSON-RPC error response."""
    send_response({
        "jsonrpc": "2.0",
        "id": id,
        "error": {"code": code, "message": message}
    })


def handle_initialize(id, params):
    """Handle initialize request."""
    send_response({
        "jsonrpc": "2.0",
        "id": id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "ui-ux-pro-max",
                "version": "2.0.0"
            }
        }
    })


def handle_tools_list(id, params):
    """Handle tools/list request."""
    tools = [
        {
            "name": "search",
            "description": "Search UI/UX design database. Domains: style, color, chart, landing, product, ux, typography, icons, components, animations, react, web",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query (e.g., 'glassmorphism dark mode', 'SaaS dashboard')"},
                    "domain": {"type": "string", "description": "Search domain (auto-detected if not specified)", "enum": list(CSV_CONFIG.keys())},
                    "max_results": {"type": "integer", "description": "Max results (default: 3)", "default": 3}
                },
                "required": ["query"]
            }
        },
        {
            "name": "search_stack",
            "description": f"Search stack-specific guidelines. Stacks: {', '.join(AVAILABLE_STACKS)}",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "stack": {"type": "string", "description": "Technology stack", "enum": AVAILABLE_STACKS},
                    "max_results": {"type": "integer", "default": 3}
                },
                "required": ["query", "stack"]
            }
        },
        {
            "name": "design_system",
            "description": "Generate complete design system recommendation with colors, typography, style, pattern, icons, and animations",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Product/style description (e.g., 'SaaS dashboard', 'beauty spa elegant')"},
                    "project_name": {"type": "string", "description": "Project name"},
                    "format": {"type": "string", "enum": ["ascii", "markdown"], "default": "markdown"},
                    "persist": {"type": "boolean", "description": "Save to design-system/ folder", "default": False},
                    "page": {"type": "string", "description": "Page-specific override name"},
                    "ab_test": {"type": "boolean", "description": "Include A/B test suggestions", "default": False}
                },
                "required": ["query"]
            }
        },
        {
            "name": "export",
            "description": "Export design system as Tailwind config, CSS variables, or Design Tokens JSON",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Product/style description"},
                    "project_name": {"type": "string"},
                    "format": {"type": "string", "enum": ["tailwind", "css", "tokens", "all"], "default": "all"},
                    "output_dir": {"type": "string", "description": "Output directory path"}
                },
                "required": ["query"]
            }
        },
        {
            "name": "review",
            "description": "Review UI code for accessibility, UX, and design issues",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File or directory path to review"}
                },
                "required": ["path"]
            }
        },
        {
            "name": "detect_stack",
            "description": "Auto-detect technology stack from project files",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_dir": {"type": "string", "description": "Project directory path (default: current directory)"}
                }
            }
        }
    ]
    
    send_response({
        "jsonrpc": "2.0",
        "id": id,
        "result": {"tools": tools}
    })


def handle_tool_call(id, params):
    """Handle tools/call request."""
    tool_name = params.get("name", "")
    arguments = params.get("arguments", {})
    
    try:
        if tool_name == "search":
            result = search(
                arguments["query"],
                arguments.get("domain"),
                arguments.get("max_results", 3)
            )
            text = json.dumps(result, indent=2, ensure_ascii=False)
        
        elif tool_name == "search_stack":
            result = search_stack(
                arguments["query"],
                arguments["stack"],
                arguments.get("max_results", 3)
            )
            text = json.dumps(result, indent=2, ensure_ascii=False)
        
        elif tool_name == "design_system":
            text = generate_design_system(
                arguments["query"],
                arguments.get("project_name"),
                arguments.get("format", "markdown"),
                persist=arguments.get("persist", False),
                page=arguments.get("page"),
                ab_test=arguments.get("ab_test", False)
            )
        
        elif tool_name == "export":
            from export import export_design_system as do_export
            text = do_export(
                arguments["query"],
                arguments.get("project_name"),
                arguments.get("format", "all"),
                arguments.get("output_dir")
            )
        
        elif tool_name == "review":
            text = review_code(arguments["path"])
        
        elif tool_name == "detect_stack":
            stack = detect_tech_stack(arguments.get("project_dir"))
            text = f"Detected stack: {stack}"
        
        else:
            send_error(id, -32601, f"Unknown tool: {tool_name}")
            return
        
        send_response({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "content": [{"type": "text", "text": text}]
            }
        })
    
    except Exception as e:
        send_response({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                "isError": True
            }
        })


def main():
    """Main MCP server loop."""
    while True:
        try:
            # Read Content-Length header
            header = ""
            while True:
                line = sys.stdin.readline()
                if not line or line == "\r\n" or line == "\n":
                    break
                header += line
            
            if not header:
                break
            
            # Parse content length
            content_length = 0
            for line in header.split("\n"):
                if line.lower().startswith("content-length:"):
                    content_length = int(line.split(":")[1].strip())
            
            if content_length == 0:
                continue
            
            # Read body
            body = sys.stdin.read(content_length)
            request = json.loads(body)
            
            method = request.get("method", "")
            id = request.get("id")
            params = request.get("params", {})
            
            if method == "initialize":
                handle_initialize(id, params)
            elif method == "notifications/initialized":
                pass  # No response needed
            elif method == "tools/list":
                handle_tools_list(id, params)
            elif method == "tools/call":
                handle_tool_call(id, params)
            else:
                if id is not None:
                    send_error(id, -32601, f"Method not found: {method}")
        
        except json.JSONDecodeError:
            continue
        except EOFError:
            break
        except KeyboardInterrupt:
            break


if __name__ == "__main__":
    main()
