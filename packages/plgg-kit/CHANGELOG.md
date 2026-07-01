# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- LLMs module with provider abstractions and vendor implementations
  - OpenAI vendor integration with structured outputs
  - Anthropic (Claude) vendor integration with JSON parsing
  - Google Gemini vendor integration
  - `generateObject` usecase for AI-powered object generation
- Type definitions for LLM providers
- Comprehensive test suite for vendor implementations and generateObject utility
