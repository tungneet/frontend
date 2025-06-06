// API Configuration
const API_BASE_URL = "https://xzi0jposzj.execute-api.ap-south-1.amazonaws.com/development";

// State Management
let currentUser = "user_1234";
let apiConnected = false;
let lastQuestion = "";
let lastResponse = "";
let currentRating = 0;

// Page Navigation - FIXED: Proper event handling
function showPage(pageId, event) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation - FIXED: Check if event exists
    if (event && event.target) {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    // Load FAQs when FAQ page is shown - FIXED: Check if page exists
    if (pageId === 'faqs') {
        setTimeout(() => loadAllFAQs(), 100); // Small delay to ensure DOM is ready
    }
}

// API Functions
async function testConnection() {
    showStatus("Testing connection...", "info");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/get-active-users`, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            apiConnected = true;
            showStatus("✅ Successfully connected to API", "success");
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        apiConnected = false;
        if (error.name === 'AbortError') {
            showStatus("❌ Connection timeout. Please check API status.", "error");
        } else {
            showStatus(`❌ Connection failed: ${error.message}`, "error");
        }
    }
}

async function sendMessage() {
    const question = document.getElementById('question').value.trim();
    if (!question) {
        showStatus("Please enter a question.", "warning");
        return;
    }

    if (!apiConnected) {
        showStatus("Please test API connection first.", "warning");
        return;
    }

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('response').style.display = 'none';
    document.getElementById('faqs').style.display = 'none';
    document.getElementById('rating').style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser, question: question })
        });

        const result = await response.json();
        document.getElementById('loading').style.display = 'none';

        if (result.answer) {
            // Clean and display answer
            const uniqueLines = [...new Set(result.answer.split('\n'))];
            const cleanedAnswer = uniqueLines.join('\n');
            
            document.getElementById('responseContent').innerHTML = cleanedAnswer.replace(/\n/g, '<br>');
            document.getElementById('response').style.display = 'block';

            // Display FAQs if available
            if (result.faqs && result.faqs.length > 0) {
                displayFaqs(result.faqs, result.faq_intro);
            }

            // Store for rating
            lastQuestion = question;
            lastResponse = cleanedAnswer;
            document.getElementById('rating').style.display = 'block';
            
            // Clear question
            document.getElementById('question').value = '';
        } else if (result.error) {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showStatus(`API Error: ${error.message}`, "error");
    }
}

function displayFaqs(faqs, intro) {
    const faqContent = document.getElementById('faqContent');
    if (!faqContent) return;
    
    let html = '';
    
    if (intro) {
        html += `<h4>${intro}</h4>`;
    }
    
    faqs.forEach((faq, index) => {
        html += `
            <div class="faq-item">
                <div class="faq-question" onclick="toggleChatFaq(${index})">
                    ${faq.question}
                    <span>+</span>
                </div>
                <div class="faq-answer" id="chatFaq${index}" style="display: none;">
                    <strong>Q:</strong> ${faq.question}<br>
                    <strong>A:</strong> ${faq.answer}
                </div>
            </div>
        `;
    });
    
    faqContent.innerHTML = html;
    document.getElementById('faqs').style.display = 'block';
}

function toggleChatFaq(index) {
    const answer = document.getElementById(`chatFaq${index}`);
    if (!answer) return;
    
    const question = answer.previousElementSibling;
    const icon = question.querySelector('span');
    
    if (answer.style.display === 'none' || !answer.style.display) {
        answer.style.display = 'block';
        if (icon) icon.textContent = '-';
    } else {
        answer.style.display = 'none';
        if (icon) icon.textContent = '+';
    }
}

// Rating System
function setRating(rating) {
    currentRating = rating;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitRating() {
    if (currentRating === 0) {
        showStatus("Please select a rating before submitting.", "warning");
        return;
    }

    const suggestion = document.getElementById('suggestion').value.trim();
    
    try {
        const payload = {
            user_id: currentUser,
            question: lastQuestion,
            rating: currentRating
        };
        
        if (suggestion) {
            payload.suggestion = suggestion;
        }

        const response = await fetch(`${API_BASE_URL}/rate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.message) {
            showStatus("Rating and suggestion submitted. We appreciate your feedback! 🙂", "success");
            document.getElementById('rating').style.display = 'none';
        } else if (result.error) {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`API Error: ${error.message}`, "error");
    }
}

// User Management
function showUserManagement() {
    const userMgmt = document.getElementById('userManagement');
    if (userMgmt) {
        userMgmt.style.display = userMgmt.style.display === 'none' ? 'block' : 'none';
    }
}

async function changeUser() {
    const newUserId = document.getElementById('newUserId').value.trim();
    if (!newUserId) {
        showStatus("Please enter a new user ID.", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/change-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_user_id: currentUser, new_user_id: newUserId })
        });

        const result = await response.json();
        
        if (result.message) {
            currentUser = newUserId;
            const currentUserElement = document.getElementById('currentUser');
            if (currentUserElement) {
                currentUserElement.textContent = newUserId;
            }
            showStatus(`Successfully switched to: ${newUserId}`, "success");
            const userMgmt = document.getElementById('userManagement');
            if (userMgmt) {
                userMgmt.style.display = 'none';
            }
        } else if (result.error) {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`API Error: ${error.message}`, "error");
    }
}

async function loadActiveUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/get-active-users`);
        const result = await response.json();
        
        if (result.active_users) {
            const usersDiv = document.getElementById('activeUsers');
            if (usersDiv) {
                if (result.active_users.length > 0) {
                    let html = '<h4>Currently Active Users:</h4><ul>';
                    result.active_users.forEach(user => {
                        html += `<li style="margin: 0.5rem 0; color: #667eea;">${user}</li>`;
                    });
                    html += '</ul>';
                    usersDiv.innerHTML = html;
                } else {
                    usersDiv.innerHTML = '<p style="color: #666;">No active users found</p>';
                }
            }
        } else if (result.error) {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`API Error: ${error.message}`, "error");
    }
}

// History Management
async function loadHistory() {
    const historySection = document.getElementById('historySection');
    if (!historySection) return;
    
    historySection.style.display = historySection.style.display === 'none' ? 'block' : 'none';
    
    if (historySection.style.display === 'block') {
        try {
            const response = await fetch(`${API_BASE_URL}/get-history/${currentUser}`);
            const result = await response.json();
            
            if (result.chats) {
                const historyContent = document.getElementById('historyContent');
                if (historyContent) {
                    if (Object.keys(result.chats).length > 0) {
                        let html = '';
                        Object.entries(result.chats).forEach(([title, chat]) => {
                            html += `
                                <div class="history-item">
                                    <h4>💬 ${title}</h4>
                                    <p><strong>Question:</strong><br>${chat.question}</p>
                                    <p><strong>Answer:</strong><br>${chat.answer}</p>
                                </div>
                            `;
                        });
                        historyContent.innerHTML = html;
                    } else {
                        historyContent.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">No chat history found for this user</p>';
                    }
                }
            } else if (result.error) {
                showStatus(`Error: ${result.error}`, "error");
            }
        } catch (error) {
            showStatus(`API Error: ${error.message}`, "error");
        }
    }
}

// Contact Form
async function submitContact() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
        showStatus("Please fill out all fields before submitting.", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/contact-us`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });

        const result = await response.json();
        
        if (result.message) {
            showStatus("Your message was submitted successfully. We'll get back to you soon.", "success");
            // Clear form
            document.getElementById('contactName').value = '';
            document.getElementById('contactEmail').value = '';
            document.getElementById('contactMessage').value = '';
        } else if (result.error) {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`API Error: ${error.message}`, "error");
    }
}

// Status Message Display - FIXED: Better error handling
function showStatus(message, type) {
    try {
        // Remove existing status messages
        const existingStatus = document.querySelector('.status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new status message
        const statusDiv = document.createElement('div');
        statusDiv.className = `status ${type}`;
        statusDiv.innerHTML = message;

        // Insert after the chat body or main content area
        const targetElement = document.querySelector('.chat-body') || 
                             document.querySelector('.main-content') || 
                             document.querySelector('.container') ||
                             document.body;
        targetElement.appendChild(statusDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Error showing status message:', error);
    }
}

// FAQ Functions - FIXED: Better error handling and loading states
async function loadAllFAQs() {
    const container = document.getElementById('allFAQsContainer');
    if (!container) {
        console.error('FAQ container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #667eea;">Loading FAQs...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/all-faqs`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.topics && Object.keys(result.topics).length > 0) {
            displayAllFAQs(result.topics);
        } else if (result.error) {
            container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #e74c3c;">Error loading FAQs: ${result.error}</div>`;
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No FAQs available at the moment.</div>';
        }
    } catch (error) {
        console.error('FAQ loading error:', error);
        container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #e74c3c;">Failed to load FAQs: ${error.message}</div>`;
    }
}

function displayAllFAQs(topics) {
    const container = document.getElementById('allFAQsContainer');
    if (!container) return;
    
    let html = '';
    
    Object.entries(topics).forEach(([topic, faqs], topicIndex) => {
        html += `<div class="faq-topic-section">`;
        html += `<h3 style="color: #667eea; margin: 2rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e8f2ff;">${topic}</h3>`;
        
        if (Array.isArray(faqs) && faqs.length > 0) {
            faqs.forEach((faq, faqIndex) => {
                const uniqueId = `topic${topicIndex}_faq${faqIndex}`;
                html += `
                    <div class="faq-item" style="margin-bottom: 1rem; border: 1px solid #e8f2ff; border-radius: 8px; overflow: hidden;">
                        <div class="faq-question" onclick="toggleDynamicFaq('${uniqueId}')" style="padding: 1rem; background: #f8faff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 500; color: #333;">
                            <span>${faq.question || 'No question provided'}</span>
                            <span class="toggle-icon" style="font-size: 1.2rem; color: #667eea;">+</span>
                        </div>
                        <div class="faq-answer" id="${uniqueId}" style="display: none; padding: 1rem; background: white; border-top: 1px solid #e8f2ff; line-height: 1.6;">
                            ${faq.answer || 'No answer provided'}
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<p style="color: #666; font-style: italic;">No questions available for this topic.</p>';
        }
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

async function searchFAQ() {
    const questionInput = document.getElementById('faqSearch');
    const answerDiv = document.getElementById('faqAnswer');
    const contentDiv = document.getElementById('faqAnswerContent');
    
    if (!questionInput || !answerDiv || !contentDiv) {
        showStatus("FAQ search elements not found", "error");
        return;
    }
    
    const question = questionInput.value.trim();
    
    if (!question) {
        showStatus("Please enter a question to search.", "warning");
        return;
    }

    // Show loading state
    contentDiv.innerHTML = '<div style="text-align: center; padding: 1rem; color: #667eea;">Searching...</div>';
    answerDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/faq-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.answer) {
            contentDiv.innerHTML = result.answer.replace(/\n/g, '<br>');
        } else if (result.error) {
            contentDiv.innerHTML = `<div style="color: #e74c3c;">Error: ${result.error}</div>`;
        } else {
            contentDiv.innerHTML = '<div style="color: #666;">No answer found for your question.</div>';
        }
    } catch (error) {
        console.error('FAQ search error:', error);
        contentDiv.innerHTML = `<div style="color: #e74c3c;">Search failed: ${error.message}</div>`;
    }
}

function toggleDynamicFaq(faqId) {
    const answer = document.getElementById(faqId);
    if (!answer) {
        console.error(`FAQ element with ID ${faqId} not found`);
        return;
    }
    
    const question = answer.previousElementSibling;
    const icon = question ? question.querySelector('.toggle-icon') : null;
    
    if (answer.style.display === 'none' || !answer.style.display) {
        answer.style.display = 'block';
        if (icon) icon.textContent = '-';
    } else {
        answer.style.display = 'none';
        if (icon) icon.textContent = '+';
    }
}

function clearFAQResults() {
    const searchInput = document.getElementById('faqSearch');
    const answerDiv = document.getElementById('faqAnswer');
    
    if (searchInput) searchInput.value = '';
    if (answerDiv) answerDiv.style.display = 'none';
}

// Initialize app - FIXED: Better initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing app...');
    
    // Test connection on load
    testConnection();
    
    // Set initial user
    const currentUserElement = document.getElementById('currentUser');
    if (currentUserElement) {
        currentUserElement.textContent = currentUser;
    }
    
    // Check if FAQ page is initially active and load FAQs
    const faqPage = document.getElementById('faqs');
    if (faqPage && faqPage.classList.contains('active')) {
        setTimeout(() => loadAllFAQs(), 500); // Delay to ensure DOM is fully ready
    }
    
    console.log('App initialized successfully');
});

// Mobile menu toggle (for future enhancement)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.style.display = navLinks.style.display === 'none' ? 'flex' : 'none';
    }
}

// Add mobile menu button functionality - FIXED: Better responsive handling
window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
        const nav = document.querySelector('.nav');
        if (nav && !nav.querySelector('.mobile-menu-btn')) {
            const mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.innerHTML = '☰';
            mobileMenuBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #667eea;
                display: block;
            `;
            mobileMenuBtn.onclick = toggleMobileMenu;
            nav.appendChild(mobileMenuBtn);
        }
    } else {
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        if (mobileBtn) {
            mobileBtn.remove();
        }
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.style.display = 'flex';
        }
    }
});

// Helper function to manually trigger FAQ loading (for debugging)
function manualLoadFAQs() {
    console.log('Manually loading FAQs...');
    loadAllFAQs();
}