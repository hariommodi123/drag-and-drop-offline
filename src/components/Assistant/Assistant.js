import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Mic, MicOff, Send, Bot, User, BrainCircuit, Zap } from 'lucide-react';

const Assistant = () => {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const handleSendMessageRef = useRef(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = state.voiceAssistantLanguage;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        console.log('🎤 Recognition started');
        setIsListening(true);
        dispatch({ type: 'SET_LISTENING', payload: true });
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Recognition ended');
        setIsListening(false);
        dispatch({ type: 'SET_LISTENING', payload: false });
      };

      recognitionRef.current.onerror = (event) => {
        console.error("🎤 Speech recognition error:", event.error);
        setIsListening(false);
        dispatch({ type: 'SET_LISTENING', payload: false });
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Speech recognized:', transcript);
        setInputMessage(transcript);
        setIsProcessing(false);
        setIsListening(false);
        
        // Auto-send after speech recognition
        setTimeout(() => {
          if (transcript.trim() && handleSendMessageRef.current) {
            handleSendMessageRef.current(transcript);
          }
        }, 300);
      };
    }
  }, [state.voiceAssistantLanguage, dispatch]);

  const handleSendMessage = useCallback(async (message = inputMessage) => {
    if (!message.trim()) return;

    console.log('🎯 handleSendMessage called with:', message);

    const userMessage = { type: 'user', content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Process the message using the same logic as the original
      console.log('🔍 Processing query:', message);
      const result = await processVoiceQuery(message);
      console.log('✅ Processed result:', result);
      
      const aiMessage = { 
        type: 'ai', 
        content: result.message, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the response
      console.log('🔊 About to speak response:', result.message);
      setTimeout(() => {
        speak(result.message);
      }, 500);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      const errorMessage = { 
        type: 'ai', 
        content: 'Sorry, I encountered an error processing your request.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputMessage, state, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update ref when function changes
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Advanced NLP Intent Recognition with Hindi/Hinglish Support
  const detectIntent = (query) => {
    const lowerQuery = query.toLowerCase();
    
    console.log('🔍 Detecting intent for:', query);
    
    // Intent: ADD_PRODUCT (Hindi: product add, saman add, item add)
    if ((lowerQuery.includes('add') && lowerQuery.includes('product')) || 
        lowerQuery.includes('product add') || lowerQuery.includes('saman add') || 
        lowerQuery.includes('item add') || lowerQuery.includes('product dalo') ||
        lowerQuery.includes('नया product') || lowerQuery.includes('product जोड़ो')) {
      console.log('✅ Intent detected: ADD_PRODUCT');
      return { intent: 'ADD_PRODUCT', keywords: ['add', 'product', 'item', 'saman', 'dalo'] };
    }
    
    // Intent: ADD_CUSTOMER with balance (Hindi: नया, add karo, baki, बाकी) - More specific
    // Check for balance/due keywords first (like "₹20 बाकी" or "baki" or "balance")
    // Pattern: "Sumit ₹20 बाकी" or "सुमित ₹20 बाकी" or "Raju ₹50 baki"
    if (lowerQuery.includes('बाकी') || lowerQuery.includes('baki') || 
        lowerQuery.includes('balance')) {
      // If it has "बाकी" or "baki" AND has numbers/₹ symbol, it's likely ADD_CUSTOMER
      // const hasAmount = /₹?\s*\d+/.test(query);
      const words = query.split(/\s+/);
      // Check if there's at least one word (likely a name) before amount
      const hasNameOrAmount = words.length >= 2;
      if (hasNameOrAmount) {
        console.log('✅ Intent detected: ADD_CUSTOMER (balance) for pattern:', query);
        return { intent: 'ADD_CUSTOMER', keywords: ['add', 'customer', 'baki', 'balance'] };
      }
    }
    
    // Also check for amount pattern with names (like "Sumit ₹20" or "₹20 Sumit")
    if (/₹\s*\d+/.test(query) || /\d+/.test(query)) {
      const hasHindiName = /[\u0900-\u097F]/.test(query);
      // If has Hindi characters or clear name pattern, assume ADD_CUSTOMER
      if (hasHindiName && !lowerQuery.includes('paid') && !lowerQuery.includes('जमा')) {
        console.log('✅ Intent detected: ADD_CUSTOMER (amount pattern)');
        return { intent: 'ADD_CUSTOMER', keywords: ['add', 'customer', 'amount'] };
      }
    }
    
    if ((lowerQuery.includes('add') && (lowerQuery.includes('customer') || lowerQuery.includes('ग्राहक'))) ||
        lowerQuery.includes('naya customer') || lowerQuery.includes('नया ग्राहक') || 
        lowerQuery.includes('customer add') || lowerQuery.includes('ग्राहक जोड़ो') ||
        (lowerQuery.includes('add') && (lowerQuery.includes('baki') || lowerQuery.includes('बाकी'))) ||
        (lowerQuery.includes('add') && (lowerQuery.includes('credit') || lowerQuery.includes('due')))) {
      console.log('✅ Intent detected: ADD_CUSTOMER');
      return { intent: 'ADD_CUSTOMER', keywords: ['add', 'customer', 'create', 'new', 'naya', 'karo'] };
    }
    
    // Intent: PAYMENT received (Hindi: जमा, diye, paid, de diya)
    if (lowerQuery.includes('paid') || lowerQuery.includes('pay') || lowerQuery.includes('jama') || 
        lowerQuery.includes('जमा') || lowerQuery.includes('gave') || lowerQuery.includes('de diya') || 
        lowerQuery.includes('दिया') || lowerQuery.includes('diye') || lowerQuery.includes('pay kiye')) {
      return { intent: 'PAYMENT', keywords: ['paid', 'payment', 'received', 'jama', 'diye'] };
    }
    
    // Intent: CHECK_BALANCE (Hindi: kitna de deta, balance batao, कितना)
    if (lowerQuery.includes('balance') || lowerQuery.includes('kitna') || lowerQuery.includes('कितना') ||
        lowerQuery.includes('de deta') || lowerQuery.includes('batao') || lowerQuery.includes('कितने') ||
        lowerQuery.includes('owe') || lowerQuery.includes('pending')) {
      return { intent: 'CHECK_BALANCE', keywords: ['balance', 'due', 'owed', 'kitna', 'batao'] };
    }
    
    // Intent: SHOW_REPORT (Hindi: report, aaj, today, profit)
    if (lowerQuery.includes('report') || lowerQuery.includes('show') || lowerQuery.includes('report') ||
        lowerQuery.includes('today') || lowerQuery.includes('आज') || lowerQuery.includes('aaj') ||
        lowerQuery.includes('sale') || lowerQuery.includes('profit') || lowerQuery.includes('bikri')) {
      return { intent: 'SHOW_REPORT', keywords: ['report', 'sales', 'today', 'aaj', 'profit'] };
    }
    
    // Intent: DELETE_CUSTOMER (Hindi: हटाओ, delete, hatao, remove)
    if (lowerQuery.includes('delete') || lowerQuery.includes('remove') || lowerQuery.includes('हटाओ') ||
        lowerQuery.includes('hatao') || lowerQuery.includes('remove')) {
      return { intent: 'DELETE_CUSTOMER', keywords: ['delete', 'remove', 'hatao'] };
    }
    
    // Intent: SHOW_CUSTOMERS (Hindi: सभी, sabhi, list, dikhao)
    if (lowerQuery.includes('list') || lowerQuery.includes('customers') || lowerQuery.includes('सभी') ||
        lowerQuery.includes('sabhi') || lowerQuery.includes('dikhao') || lowerQuery.includes('show all') ||
        lowerQuery.includes('all customers')) {
      return { intent: 'SHOW_CUSTOMERS', keywords: ['list', 'customers', 'all', 'sabhi', 'dikhao'] };
    }
    
    // Intent: CREDIT_AMOUNT (Hindi: credit de, credit do)
    if (lowerQuery.includes('credit') || lowerQuery.includes('credit de') || lowerQuery.includes('credit do') ||
        lowerQuery.includes('ko credit')) {
      return { intent: 'CREDIT_AMOUNT', keywords: ['credit', 'give credit'] };
    }
    
    // Intent: CLEAR_BALANCE (Hindi: balance clear, clear karo)
    if (lowerQuery.includes('clear') || lowerQuery.includes('balance clear') || lowerQuery.includes('clear karo')) {
      return { intent: 'CLEAR_BALANCE', keywords: ['clear', 'balance clear'] };
    }
    
    // Intent: SHOW_PENDING
    if (lowerQuery.includes('pending') || lowerQuery.includes('kuch baki') || lowerQuery.includes('due payments')) {
      return { intent: 'SHOW_PENDING', keywords: ['pending', 'due', 'baki'] };
    }
    
    // Intent: TOTAL_BALANCE
    if (lowerQuery.includes('total balance') || lowerQuery.includes('total collection') || 
        lowerQuery.includes('sabka balance')) {
      console.log('✅ Intent detected: TOTAL_BALANCE');
      return { intent: 'TOTAL_BALANCE', keywords: ['total', 'collection', 'sabka'] };
    }
    
    // Intent: GENERATE_BILL
    if (lowerQuery.includes('generate bill') || lowerQuery.includes('bill generate') || 
        lowerQuery.includes('bill banao') || lowerQuery.includes('bill banaiye') ||
        lowerQuery.includes('create bill') || lowerQuery.includes('bill create')) {
      console.log('✅ Intent detected: GENERATE_BILL');
      return { intent: 'GENERATE_BILL', keywords: ['generate', 'bill', 'create'] };
    }
    
    // FALLBACK: If query has amount (₹ or digits) and name-like pattern, assume ADD_CUSTOMER
    const hasAmount = /₹?\s*\d+/.test(query);
    const hasName = /[\u0900-\u097F]|[A-Z][a-z]+/.test(query);
    if (hasAmount && hasName && !lowerQuery.includes('paid') && !lowerQuery.includes('जमा')) {
      console.log('✅ Intent detected: ADD_CUSTOMER (fallback pattern with amount & name)');
      return { intent: 'ADD_CUSTOMER', keywords: ['fallback', 'amount', 'name'] };
    }
    
    console.log('❌ Intent detected: UNKNOWN for:', query);
    return { intent: 'UNKNOWN', keywords: [] };
  };
  
  const processVoiceQuery = async (query) => {
    const lowerQuery = query.toLowerCase();
    console.log('🎯 Processing voice query:', query, 'Lower:', lowerQuery);
    const { intent } = detectIntent(query);
    console.log('🎯 Detected intent:', intent);
    
    // Check for DELETE intent
    if (intent === 'DELETE_CUSTOMER') {
      const customerName = extractCustomerName(query);
      const customer = state.customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );
      
      if (customer) {
        return {
          message: `🚫 Drag AI read-only मोड में है। कृपया "${customer.name}" को हटाने के लिए Customers पेज का उपयोग करें।`,
          action: null
        };
      } else {
        return {
          message: `ग्राहक "${customerName}" नहीं मिला।`,
          action: null
        };
      }
    }
    
    // Check for SHOW_CUSTOMERS intent
    if (intent === 'SHOW_CUSTOMERS') {
      const customerCount = state.customers.length;
      const totalBalance = state.customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
      
      return {
        message: `📋 कुल ग्राहक: ${customerCount} | Total Balance: ₹${totalBalance.toFixed(2)}`,
        action: 'show_customers'
      };
    }
    
    // Check for SHOW_REPORT intent
    if (intent === 'SHOW_REPORT') {
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = state.transactions.filter(t => t.date.startsWith(today));
      const todaySales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const paidCustomers = state.customers.filter(c => (c.balanceDue || 0) < 0);
      const creditAmount = paidCustomers.reduce((sum, c) => sum + Math.abs(c.balanceDue || 0), 0);
      
      return {
        message: `📊 आज की बिक्री: ₹${todaySales.toFixed(2)} | Transactions: ${todayTransactions.length} | Credit: ₹${creditAmount.toFixed(2)}`,
        action: 'show_report'
      };
    }
    
    // Check for CREDIT_AMOUNT intent
    if (intent === 'CREDIT_AMOUNT') {
      const customerName = extractCustomerName(query);
      const amount = extractAmount(query);
      
      if (customerName && customerName !== 'Unknown' && amount) {
        return await handleAddCustomerWithBalance(customerName, amount);
      }
    }
    
    // Check for CLEAR_BALANCE intent
    if (intent === 'CLEAR_BALANCE') {
      const customerName = extractCustomerName(query);
      const customer = state.customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );
      
      if (customer) {
        return {
          message: `ℹ️ ${customer.name} का वर्तमान बैलेंस ₹${(customer.balanceDue || 0).toFixed(2)} है। Drag AI read-only मोड में है, कृपया इसे Customers पेज से क्लियर करें।`,
          action: null
        };
      }
    }
    
    // Check for SHOW_PENDING intent
    if (intent === 'SHOW_PENDING') {
      const pendingCustomers = state.customers.filter(c => (c.balanceDue || 0) > 0);
      const totalPending = pendingCustomers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
      
      return {
        message: `⏳ Pending बैलेंस: ${pendingCustomers.length} ग्राहक | Total: ₹${totalPending.toFixed(2)}`,
        action: 'show_pending'
      };
    }
    
    // Check for TOTAL_BALANCE intent
    if (intent === 'TOTAL_BALANCE') {
      const totalDue = state.customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
      const totalCredit = state.customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balanceDue || 0)), 0);
      
      return {
        message: `💰 Total Collection Due: ₹${totalDue.toFixed(2)} | Credit Given: ₹${totalCredit.toFixed(2)}`,
        action: 'total_balance'
      };
    }
    
    // Check for GENERATE_BILL intent
    if (intent === 'GENERATE_BILL') {
      // Extract customer name from query
      const customerName = extractCustomerName(query);
      
      if (customerName) {
        return {
          message: `📋 Drag AI read-only मोड में है। कृपया Billing पेज खोलकर ${customerName} के लिए मैन्युअली बिल बनाएं।`,
          action: null
        };
      } else {
        return {
          message: '📋 Drag AI बिल नहीं बना सकता। कृपया Billing पेज से ग्राहक का नाम चुनकर मैन्युअली बिल जनरेट करें।',
          action: null
        };
      }
    }
    
  // Fuzzy name matching to prevent duplicates
  const fuzzyMatchName = (name1, name2, threshold = 0.7) => {
    // Normalize names for comparison
    const normalize = (str) => {
      // Remove common Hindi particles
      return str.toLowerCase()
        .replace(/का|की|को|के|में|से/gi, '')
        .replace(/\s+/g, '')
        .trim();
    };
    
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    // If exact match after normalization, return high similarity
    if (norm1 === norm2) return 1.0;
    
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    const similarity = (longer.length - distance) / longer.length;
    
    // Also check if names are transliteration variants (Hindi to English)
    const isTransliteration = checkTransliterationMatch(name1, name2);
    if (isTransliteration) return 0.95; // Very high similarity for transliteration
    
    return similarity;
  };
  
  // Transliteration function to convert Hindi to English
  const transliterateHindiToEnglish = (name) => {
    // Hindi to English mapping for common names
    const commonNames = {
      'मोहित': 'mohit', 'सोमया': 'somya', 'राजू': 'raju', 'सुनील': 'sunil',
      'राम': 'ram', 'श्याम': 'shyam', 'कृष्ण': 'krishna', 'अर्जुन': 'arjun',
      'प्रियंका': 'priyanka', 'अंकित': 'ankit', 'रवि': 'ravi', 'प्रमोद': 'pramod',
      'माधव': 'madhava', 'सोमेनी': 'someni', 'सौम्य': 'soumya'
    };
    
    // Check if it's a common name first
    if (commonNames[name]) {
      return commonNames[name];
    }
    
    // Hindi character to English mapping
    const hindiCharMap = {
      // Vowels
      'अ': 'a', 'आ': 'aa', 'ा': 'a', 'इ': 'i', 'ी': 'i', 'ई': 'ee',
      'उ': 'u', 'ू': 'u', 'ऊ': 'oo', 'ए': 'e', 'े': 'e', 
      'ऐ': 'ai', 'ओ': 'o', 'ो': 'o', 'औ': 'au', 'ौ': 'au',
      // Consonants
      'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh',
      'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh',
      'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh',
      'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
      'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
      'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
      'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h'
    };
    
    let result = '';
    for (let i = 0; i < name.length; i++) {
      const char = name[i];
      if (hindiCharMap[char]) {
        result += hindiCharMap[char];
      } else if (/[\u0900-\u097F]/.test(char)) {
        // Skip if unknown Hindi character
        continue;
      } else {
        result += char;
      }
    }
    
    return result.toLowerCase().trim() || name;
  };
  
  // Check if two names are Hindi-English transliterations
  const checkTransliterationMatch = (name1, name2) => {
    // Remove Hindi characters and check if similar
    const cleanName1 = name1.replace(/[\u0900-\u097F]/g, '').toLowerCase().trim();
    const cleanName2 = name2.replace(/[\u0900-\u097F]/g, '').toLowerCase().trim();
    
    if (cleanName1 && cleanName2) {
      return cleanName1 === cleanName2 || 
             cleanName1.includes(cleanName2) || 
             cleanName2.includes(cleanName1);
    }
    
    // Also check transliteration
    const trans1 = transliterateHindiToEnglish(name1);
    const trans2 = transliterateHindiToEnglish(name2);
    
    return trans1 === trans2 || 
           trans1.includes(trans2) || 
           trans2.includes(trans1) ||
           trans1 === name2.toLowerCase() ||
           trans2 === name1.toLowerCase();
  };
  
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };
  
  // Helper function to add customer with balance
  async function handleAddCustomerWithBalance(customerName, amount) {
    // First, try to find exact match
    let existingCustomer = state.customers.find(c => 
      c.name.toLowerCase() === customerName.toLowerCase()
    );
    
    // If not found, try fuzzy matching
    if (!existingCustomer) {
      for (const customer of state.customers) {
        const similarity = fuzzyMatchName(customer.name, customerName);
        if (similarity >= 0.7) { // 70% similarity threshold
          existingCustomer = customer;
          console.log(`Fuzzy matched: "${customer.name}" with "${customerName}" (${(similarity * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
    
    if (existingCustomer) {
      const currentBalance = existingCustomer.balanceDue || 0;
      const previewBalance = currentBalance + amount;
      
      return {
        message: `ℹ️ ${existingCustomer.name} का वर्तमान बैलेंस ₹${currentBalance.toFixed(2)} है। Drag AI read-only मोड में है, कृपया Customers पेज से ₹${amount} का अपडेट करें (नया बैलेंस: ₹${previewBalance.toFixed(2)}).`,
        action: null
      };
    } else {
      const normalizedName = /[\u0900-\u097F]/.test(customerName) 
        ? transliterateHindiToEnglish(customerName) 
        : customerName;
      
      return {
        message: `ℹ️ Drag AI नए ग्राहक नहीं जोड़ सकता। कृपया "${normalizedName}" को Customers पेज से मैन्युअली जोड़ें।`,
        action: null
      };
    }
  }
    
    // Customer balance queries - Hindi/Hinglish support with fuzzy matching
    if (intent === 'CHECK_BALANCE' || 
        ((lowerQuery.includes('balance') || lowerQuery.includes('कितना') || lowerQuery.includes('kitna')) && 
         (lowerQuery.includes('is') || lowerQuery.includes('का') || lowerQuery.includes('कितना')))) {
      const customerName = extractCustomerName(query);
      
      // Try exact match first
      let customer = state.customers.find(c => 
        c.name.toLowerCase() === customerName.toLowerCase()
      );
      
      // If not found, try fuzzy matching
      if (!customer) {
        for (const c of state.customers) {
          const similarity = fuzzyMatchName(c.name, customerName);
          if (similarity >= 0.7) {
            customer = c;
            console.log(`Fuzzy matched balance check: "${c.name}" with "${customerName}"`);
            break;
          }
        }
      }
      
      if (customer) {
        const balance = customer.balanceDue || 0;
        return {
          message: `${customer.name} का बैलेंस ₹${balance.toFixed(2)} है।`,
          action: null
        };
      } else {
        return {
          message: `ग्राहक "${customerName}" नहीं मिला।`,
          action: null
        };
      }
    }
    
    // Payment processing - Hindi/Hinglish support with proper credit handling and fuzzy matching
    if (intent === 'PAYMENT') {
      const customerName = extractCustomerName(query);
      const amount = extractAmount(query);
      
      if (customerName && customerName !== 'Unknown' && amount) {
        // Try exact match first
        let customer = state.customers.find(c => 
          c.name.toLowerCase() === customerName.toLowerCase()
        );
        
        // If not found, try fuzzy matching
        if (!customer) {
          for (const c of state.customers) {
            const similarity = fuzzyMatchName(c.name, customerName);
            if (similarity >= 0.7) {
              customer = c;
              console.log(`Fuzzy matched payment: "${c.name}" with "${customerName}"`);
              break;
            }
          }
        }
        
        if (customer) {
          const currentBalance = customer.balanceDue || 0;
          const previewBalance = currentBalance - amount;
          
          let message = `ℹ️ ${customer.name} का वर्तमान बैलेंस ₹${currentBalance.toFixed(2)} है। ₹${amount} प्राप्त होने पर नया बैलेंस ₹${previewBalance.toFixed(2)} होगा। Drag AI read-only मोड में है, कृपया यह भुगतान Customers पेज से दर्ज करें।`;
          
          return { message, action: null };
        } else {
          return {
            message: `ग्राहक "${customerName}" नहीं मिला। क्या आप नया ग्राहक जोड़ना चाहेंगे?`,
            action: null
          };
        }
      }
    }
    
    // Add product - new intent handler
    if (intent === 'ADD_PRODUCT') {
      const productName = extractProductName(query);
      
      if (productName && productName !== 'Unknown') {
        // Check if product already exists
        const existingProduct = state.products.find(p => 
          p.name.toLowerCase() === productName.toLowerCase()
        );
        
        if (existingProduct) {
          return {
            message: `ℹ️ Product "${productName}" already exists. Drag AI केवल read-only मोड में है, कृपया Products पेज से अपडेट करें।`,
            action: null
          };
        } else {
          return {
            message: `🚫 Drag AI नए उत्पाद नहीं जोड़ सकता। कृपया "${productName}" को Products पेज से मैन्युअली जोड़ें।`,
            action: null
          };
        }
      } else {
        return {
          message: 'कृपया उत्पाद का नाम बताएं। Drag AI सिर्फ पढ़ सकता है, जोड़ नहीं सकता।',
          action: null
        };
      }
    }
    
    // Add customer with balance - improved parsing with Hindi/Hinglish support and fuzzy matching
    if (intent === 'ADD_CUSTOMER') {
      console.log('📝 Processing ADD_CUSTOMER intent');
      const customerName = extractCustomerName(query);
      const amount = extractAmount(query);
      console.log('📝 Customer name extracted:', customerName, 'Amount:', amount);
      
      if (customerName && customerName !== 'Unknown') {
        // Try exact match first
        let existingCustomer = state.customers.find(c => 
          c.name.toLowerCase() === customerName.toLowerCase()
        );
        
        // If not found, try fuzzy matching
        if (!existingCustomer) {
          for (const customer of state.customers) {
            const similarity = fuzzyMatchName(customer.name, customerName);
            if (similarity >= 0.7) {
              existingCustomer = customer;
              console.log(`Fuzzy matched add: "${customer.name}" with "${customerName}"`);
              break;
            }
          }
        }
        
        if (existingCustomer) {
          return {
            message: `ℹ️ ग्राहक "${existingCustomer.name}" का वर्तमान बैलेंस ₹${(existingCustomer.balanceDue || 0).toFixed(2)} है। Drag AI read-only मोड में है, कृपया यह परिवर्तन Customers पेज से करें।`,
            action: null
          };
        } else {
          // Convert Hindi name to English for storage
          const normalizedName = /[\u0900-\u097F]/.test(customerName) 
            ? transliterateHindiToEnglish(customerName) 
            : customerName;
          
          // Add new customer
          return {
            message: `🚫 Drag AI नए ग्राहक नहीं जोड़ सकता। कृपया "${normalizedName}" को Customers पेज से मैन्युअली जोड़ें।`,
            action: null
          };
        }
      } else {
        // Customer name not found
        return {
          message: `ग्राहक का नाम नहीं मिला। कृपया नाम और राशि दोनों प्रदान करें। (No customer name found)`,
          action: null
        };
      }
    }
    
    // Default response in Hindi/Hinglish
    return {
      message: "मैं समझ गया, लेकिन और स्पष्ट निर्देश चाहिए। कृपया कहें जैसे: ",
      action: null
    };
  };

  const extractCustomerName = (query) => {
    console.log('🔍 Extracting customer name from:', query);
    const words = query.split(' ');
    console.log('📝 Words:', words);
    
    // Hindi and English stop words (including Hindi particles)
    const stopWords = [
      'add', 'the', 'is', 'and', 'to', 'with', 'baki', 'बाकी', 'देना', 'dene',
      'due', 'paid', 'जमा', 'jama', '₹', 'rupee', 'rupees', 'रुपए', 'रुपये',
      'देने', 'करो', 'कर', 'लगाओ', 'लगाना', 'रूपये', 'rupees', 'रुपए',
      'का', 'की', 'को', 'के', 'में', 'से', 'पर', 'par', 'ke', 'ki', 'ka', 'mein'
    ];
    
    // Find position of keywords (amount markers like ₹, rupee, etc.)
    const keywordIndex = words.findIndex(word => 
      word.includes('₹') || /^\d+/.test(word) || stopWords.some(stop => word.toLowerCase().includes(stop.toLowerCase()))
    );
    console.log('📍 Keyword index:', keywordIndex);
    
    // Name is before the keyword
    if (keywordIndex > 0) {
      const nameWords = words.slice(0, keywordIndex).filter(w => {
        const lower = w.toLowerCase();
        return !w.match(/^\d+/) && w.length > 1 && !stopWords.includes(lower);
      });
      console.log('✅ Name words:', nameWords);
      if (nameWords.length > 0) {
        const name = nameWords.join(' ');
        console.log('✅ Extracted name:', name);
        return name;
      }
    }
    
    // Try to find capitalized words or Hindi words that might be names
    const potentialNames = words.filter(word => {
      const lower = word.toLowerCase();
      return word.length > 1 && 
             !stopWords.includes(lower) && 
             !lower.match(/^\d/) &&
             (word[0] === word[0].toUpperCase() || /[\u0900-\u097F]/.test(word));
    });
    console.log('🔤 Potential names:', potentialNames);
    
    if (potentialNames.length > 0) {
      console.log('✅ Using potential name:', potentialNames[0]);
      return potentialNames[0];
    }
    
    // Fallback: take first word that's not a stop word and not a number
    for (const word of words) {
      const lower = word.toLowerCase();
      if (word.length > 1 && !stopWords.includes(lower) && !lower.match(/^\d/)) {
        console.log('✅ Using fallback name:', word);
        return word;
      }
    }
    
    console.log('❌ No name found, returning Unknown');
    return 'Unknown';
  };

  const extractProductName = (query) => {
    const words = query.split(' ');
    
    // Product-related stop words
    const stopWords = [
      'add', 'product', 'item', 'saman', 'dalo', 'जोड़ो', 'नया', 'naya',
      'the', 'is', 'and', 'to', 'with', 'in', 'to', 'inventory'
    ];
    
    // Find the product name after "add product" or similar patterns
    const addIndex = words.findIndex(word => 
      word.toLowerCase() === 'add' || word.toLowerCase() === 'dalo' || word.toLowerCase() === 'जोड़ो'
    );
    
    if (addIndex >= 0 && addIndex < words.length - 1) {
      // Get words after "add" and filter out stop words
      const productWords = words.slice(addIndex + 1).filter(w => {
        const lower = w.toLowerCase();
        return !stopWords.includes(lower) && w.length > 1;
      });
      
      if (productWords.length > 0) {
        return productWords.join(' ');
      }
    }
    
    // Fallback: find any word that's not a stop word
    for (const word of words) {
      const lower = word.toLowerCase();
      if (word.length > 1 && !stopWords.includes(lower) && !lower.match(/^\d/)) {
        return word;
      }
    }
    
    return 'Unknown';
  };

  const extractAmount = (query) => {
    const match = query.match(/₹?(\d+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const speak = async (text) => {
    console.log('🔊 Speak called with:', text);
    console.log('🔊 Voice assistant enabled:', state.voiceAssistantEnabled);
    console.log('🔊 Current language:', state.currentLanguage);
    console.log('🔊 Speech synthesis available:', 'speechSynthesis' in window);
    
    if (state.voiceAssistantEnabled !== false) {
      // Try browser speech synthesis first (more reliable)
      if ('speechSynthesis' in window) {
        console.log('🔊 Using browser speech synthesis');
        speechSynthesis.cancel();
        
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = state.currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 1.0;
          
          utterance.onstart = () => {
            console.log('🔊 Browser speech started:', text);
          };
          
          utterance.onend = () => {
            console.log('🔊 Browser speech ended');
          };
          
          utterance.onerror = (event) => {
            console.error('🔊 Browser speech error:', event.error);
            // Try Google TTS as fallback
            tryGoogleTTS(text);
          };
          
          try {
            speechSynthesis.speak(utterance);
            console.log('🔊 speechSynthesis.speak() called');
          } catch (error) {
            console.error('🔊 Error calling speechSynthesis.speak():', error);
            tryGoogleTTS(text);
          }
        }, 100);
      } else {
        console.log('🔊 Speech synthesis not available, trying Google TTS');
        tryGoogleTTS(text);
      }
    } else {
      console.log('🔊 Voice assistant disabled');
    }
  };

  const tryGoogleTTS = async (text) => {
    console.log('🔊 Trying Google TTS API');
    try {
      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': 'AIzaSyDiqf-vNMjF5SdGzC_15FwZ5IOyAjtuVVM'
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: state.currentLanguage === 'hi' ? 'hi-IN' : 'en-US',
            name: state.currentLanguage === 'hi' ? 'hi-IN-Wavenet-A' : 'en-US-Wavenet-D',
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0.0,
            volumeGainDb: 0.0
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const audioData = data.audioContent;
        
        // Create audio element and play
        const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
        
        audio.oncanplaythrough = () => {
          console.log('🔊 Google TTS audio ready to play');
          audio.play();
        };
        
        audio.onplay = () => {
          console.log('🔊 Google TTS speech started:', text);
        };
        
        audio.onended = () => {
          console.log('🔊 Google TTS speech ended');
        };
        
        audio.onerror = (error) => {
          console.error('🔊 Google TTS audio error:', error);
        };
        
        // Load the audio
        audio.load();
      } else {
        console.error('🔊 Google TTS API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔊 Google TTS error response:', errorText);
      }
    } catch (error) {
      console.error('🔊 Google TTS error:', error);
    }
  };


  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Expose test function globally for debugging
  React.useEffect(() => {
    window.testSpeech = () => {
      const testText = state.currentLanguage === 'hi' ? 'नमस्ते, यह एक परीक्षण है' : 'Hello, this is a test';
      console.log('🧪 Global test speech triggered');
      console.log('🧪 Voice assistant enabled:', state.voiceAssistantEnabled);
      console.log('🧪 Current language:', state.currentLanguage);
      speak(testText);
    };
    
    // Auto-test speech on component mount (for debugging)
    setTimeout(() => {
      console.log('🧪 Auto-testing speech synthesis on mount');
      const testText = 'Voice assistant is ready';
      speak(testText);
    }, 2000);
  }, [state.currentLanguage, state.voiceAssistantEnabled]);

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-xl blur-md opacity-50"></div>
                <div className="relative bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/30">
                  <BrainCircuit className="h-8 w-8 text-white drop-shadow-lg" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                Drag AI
              </h1>
            </div>
            <p className="text-white/90 text-sm sm:text-base ml-14">
              <span className="hidden sm:inline">Your intelligent voice-powered assistant | आपका बुद्धिमान सहायक</span>
              <span className="sm:hidden">Voice-Powered Assistant</span>
            </p>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">Ready</span>
          </div>
        </div>
      </div>

      {/* Chat Interface - Premium Design */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[calc(100vh-340px)] sm:h-[600px] flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              {/* AI Avatar */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-2xl shadow-2xl">
                  <BrainCircuit className="h-12 w-12 sm:h-16 sm:w-16 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Hi! I'm Drag AI
              </h2>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                <span className="hidden sm:inline">आपका स्मार्ट बिजनेस सहायक | Your Smart Business Assistant</span>
                <span className="sm:hidden">Your Smart Assistant</span>
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mb-8">
                Speak or type to manage customers, payments, and more
              </p>
              
              {/* Example Commands */}
              <div className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-6 text-left shadow-lg">
                <p className="text-sm sm:text-base font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Try saying:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-lg">💰</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">"राजू ₹50 बाकी"</p>
                      <p className="text-xs text-gray-500">Add customer balance</p>
                    </div>
                  </li>
                  <li className="hidden sm:flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-lg">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium">"सुनील ने ₹30 जमा किया"</p>
                      <p className="text-xs text-gray-500">Record payment</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-lg">📊</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">"Show today's report"</p>
                      <p className="text-xs text-gray-500">View sales summary</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md lg:max-w-lg px-4 py-3 sm:px-5 sm:py-3 rounded-2xl shadow-md ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.type === 'ai' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                        <BrainCircuit className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {message.type === 'ai' && (
                        <p className="text-xs font-semibold text-indigo-600 mb-1">Drag AI</p>
                      )}
                      <p className={`text-sm sm:text-base break-words ${message.type === 'ai' ? 'text-gray-800' : 'text-white'}`}>
                        {message.content}
                      </p>
                      <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <BrainCircuit className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-1">Drag AI</p>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Premium Design */}
        <div className="border-t-2 border-gray-100 p-4 sm:p-5 bg-white">
          <div className="flex gap-3">
            {/* Mic Button - Large and Prominent */}
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse ring-4 ring-red-200' 
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              }`}
            >
              {isListening ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6 mx-auto" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6 mx-auto" />}
            </button>
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Drag AI anything..."
                className="w-full px-4 py-3 sm:py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-sm sm:text-base disabled:bg-gray-50"
                disabled={isProcessing}
              />
            </div>
            
            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isProcessing}
              className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="h-5 w-5 mx-auto" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              <span className="hidden sm:inline">Press Enter to send • Click mic to speak</span>
              <span className="sm:hidden">Tap mic or type</span>
            </p>
            <button
              onClick={() => {
                const testText = 'Hello, I am Drag AI, your business assistant';
                console.log('🧪 Manual test speech triggered');
                speak(testText);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              title="Test Voice"
            >
              <span className="hidden sm:inline">🔊 Test Voice</span>
              <span className="sm:hidden">🔊</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Status - Premium Design */}
      {isListening && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="w-4 h-4 bg-white rounded-full animate-ping absolute"></div>
              <div className="w-4 h-4 bg-white rounded-full relative"></div>
            </div>
            <span className="font-bold text-lg">Listening to your voice...</span>
            <Mic className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Assistant;
