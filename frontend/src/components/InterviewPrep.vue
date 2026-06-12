<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Interview Prep</h1>
        <p class="page-subtitle">Practice answering real interview questions for one of your applications</p>
      </div>
    </div>

    <!-- Select an application -->
    <template v-if="stage === 'select'">
      <div v-if="loadingApps" class="empty-state"><div class="spinner"></div></div>

      <div v-else-if="eligibleApps.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </div>
        <p class="empty-title">No applications ready for practice yet</p>
        <p class="empty-sub">Add a job description and upload a CV to an application, then come back here to practice.</p>
        <a href="/" class="btn-primary" style="margin-top: 8px">Go to Dashboard</a>
      </div>

      <div v-else class="app-list">
        <div v-for="app in eligibleApps" :key="app.id" class="app-row" @click="selectApp(app)">
          <div class="app-avatar" :style="{ background: avatarBg(app.company) }">{{ initials(app.company) }}</div>
          <div class="app-info">
            <div class="company-name">{{ app.company }}</div>
            <div class="role-name">{{ app.role }}</div>
          </div>
          <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>
    </template>

    <!-- Ready to start -->
    <div v-else-if="stage === 'ready'" class="card prep-ready">
      <button class="btn-ghost btn-sm back-btn" @click="reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Choose different application
      </button>

      <div class="prep-ready-app">
        <div class="app-avatar" :style="{ background: avatarBg(selectedApp.company) }">{{ initials(selectedApp.company) }}</div>
        <div class="app-info">
          <div class="company-name">{{ selectedApp.company }}</div>
          <div class="role-name">{{ selectedApp.role }}</div>
        </div>
      </div>

      <div class="mode-picker">
        <button type="button" class="mode-card" :class="{ active: practiceMode === 'ai' }" @click="practiceMode = 'ai'">
          <strong>AI Questions</strong>
          <span>5 questions generated from this job's description and your CV — general, experience-based, and gap-probing.</span>
        </button>
        <button type="button" class="mode-card" :class="{ active: practiceMode === 'common' }" @click="practiceMode = 'common'">
          <strong>Common Questions</strong>
          <span>4 classic questions: introduce yourself, why this company, why you're leaving, and your questions for us.</span>
        </button>
      </div>

      <p class="prep-ready-desc">
        <template v-if="practiceMode === 'ai'">
          We'll generate 5 interview questions based on this job description and your uploaded CV — a mix of general,
          experience-based, and gap-probing questions. Answer each one (typed or spoken) and get instant feedback plus
          a model answer grounded in your real experience.
        </template>
        <template v-else>
          Practice 4 questions almost every interview includes. Answer each one (typed or spoken) and get instant feedback
          plus a model answer grounded in your real experience.
        </template>
      </p>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <button class="btn-primary" @click="startPractice" :disabled="loadingQuestions">
        <span v-if="loadingQuestions" class="spinner spinner-sm"></span>
        {{ loadingQuestions ? 'Preparing questions…' : 'Start Practice' }}
      </button>
    </div>

    <!-- Interactive Q&A -->
    <div v-else-if="stage === 'qna'" class="qna-wrap">
      <div class="qna-top">
        <button class="btn-ghost btn-sm back-btn" @click="reset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Choose different application
        </button>
        <span class="qna-progress-label">Question {{ currentIndex + 1 }} of {{ questions.length }}</span>
      </div>

      <div class="progress-track"><div class="progress-fill" :style="{ width: progressPct + '%' }"></div></div>

      <div class="qna-main-row">
        <div class="card qna-question-card">
          <div class="qna-question-head">
            <span class="qna-tag">Interview Question</span>
            <button v-if="speechSupported" class="btn-ghost btn-sm" @click="speaking ? stopSpeaking() : speak(currentQuestion)">
              <svg v-if="!speaking" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>
              </svg>
              {{ speaking ? 'Stop' : 'Read Aloud' }}
            </button>
          </div>
          <p class="qna-question-text">{{ currentQuestion }}</p>
        </div>

        <div v-if="cameraSupported" class="card camera-card">
          <div class="camera-head">
            <span class="qna-tag">Camera</span>
            <button class="btn-ghost btn-sm" @click="toggleCamera" :disabled="recordingVideo">
              {{ cameraEnabled ? 'Turn Off' : 'Enable Camera' }}
            </button>
          </div>

          <div v-if="cameraEnabled" class="camera-body">
            <video v-show="!recordedVideoUrl" ref="videoEl" class="camera-preview camera-live" autoplay muted playsinline></video>
            <video v-if="recordedVideoUrl" class="camera-preview" :src="recordedVideoUrl" controls playsinline></video>

            <div v-if="!recordedVideoUrl && faceDetectionSupported" class="face-status" :class="{ 'face-warn': faceDetected === false, 'face-ok': faceDetected === true }">
              <template v-if="faceDetected === false">Look at the camera — face not detected</template>
              <template v-else-if="faceDetected === true">Looking at the camera</template>
              <template v-else>Checking…</template>
            </div>

            <div class="camera-record-row">
              <button v-if="!recordedVideoUrl" class="btn-ghost btn-sm" :class="{ 'btn-recording': recordingVideo }" @click="toggleVideoRecording">
                {{ recordingVideo ? `Stop · ${formatDuration(recordingDuration)}` : 'Record Answer' }}
              </button>
              <template v-else>
                <span class="empty-sub">Recorded · {{ formatDuration(recordingDuration) }}</span>
                <button class="btn-ghost btn-sm" @click="discardRecording">Re-record</button>
              </template>
            </div>
            <p v-if="recognitionSupported" class="empty-sub">Recording also transcribes your answer into the box below.</p>
            <p v-else class="empty-sub">Voice transcription isn't supported in this browser — type your answer manually.</p>
          </div>
          <p v-else class="empty-sub">Enable your camera to see yourself and optionally record this answer for review.</p>

          <p class="empty-sub camera-note">Stays in your browser — nothing is uploaded.</p>
        </div>
      </div>

      <div class="card">
        <div class="qna-answer-head">
          <label class="form-label">Your Answer</label>
          <div class="qna-voice-controls">
            <select v-model="voiceLang" class="lang-select" :disabled="recording">
              <option value="en-US">English</option>
              <option value="id-ID">Bahasa Indonesia</option>
            </select>
            <select
              v-if="voicesForLang.length > 1"
              v-model="selectedVoiceURI"
              class="lang-select voice-select"
              title="Voice"
              :disabled="recording || speaking"
            >
              <option v-for="v in voicesForLang" :key="v.voiceURI" :value="v.voiceURI">{{ voiceLabel(v) }}</option>
            </select>
            <button
              v-if="recognitionSupported"
              class="btn-ghost btn-sm"
              :class="{ 'btn-recording': recording }"
              @click="toggleRecording"
              :disabled="!!feedback || recordingVideo"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              {{ recording ? 'Stop Recording' : 'Speak Answer' }}
            </button>
          </div>
        </div>

        <textarea
          v-model="answer"
          rows="6"
          placeholder="Type your answer, or use Speak Answer…"
          :disabled="!!feedback || submitting"
        ></textarea>

        <div v-if="error" class="error-msg qna-error">{{ error }}</div>

        <div v-if="!feedback" class="qna-actions">
          <button class="btn-primary" @click="submitAnswer" :disabled="submitting || !answer.trim() || recordingVideo">
            <span v-if="submitting" class="spinner spinner-sm"></span>
            {{ submitting ? 'Thinking…' : 'Get Feedback' }}
          </button>
        </div>
      </div>

      <div v-if="feedback" class="card feedback-card">
        <div class="feedback-block">
          <h3 class="feedback-heading">Feedback</h3>
          <p class="feedback-text">{{ feedback.feedback }}</p>
        </div>
        <div class="feedback-block">
          <h3 class="feedback-heading">Suggested Answer</h3>
          <p class="feedback-text improved-answer">{{ feedback.improved_answer }}</p>
        </div>
        <button class="btn-primary" @click="nextQuestion">{{ isLastQuestion ? 'Finish Practice' : 'Next Question' }}</button>
      </div>
    </div>

    <!-- Done -->
    <div v-else-if="stage === 'done'" class="qna-wrap">
      <div class="card empty-state">
        <div class="empty-icon done-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 17"/>
          </svg>
        </div>
        <p class="empty-title">Practice session complete</p>
        <p class="empty-sub">You answered all {{ questions.length }} questions for {{ selectedApp.role }} at {{ selectedApp.company }}.</p>
      </div>

      <div v-if="loadingSummary" class="card empty-state">
        <div class="spinner"></div>
        <p class="empty-sub">Reviewing your answers…</p>
      </div>

      <div v-else-if="summaryError" class="error-msg">{{ summaryError }}</div>

      <div v-else-if="summary" class="card summary-card">
        <h3 class="feedback-heading">Overall Assessment</h3>
        <p class="feedback-text">{{ summary.overall_assessment }}</p>

        <div class="summary-grid">
          <div v-if="summary.strengths?.length" class="summary-block">
            <h4 class="summary-subheading">Strengths</h4>
            <ul class="summary-list">
              <li v-for="(s, i) in summary.strengths" :key="i">{{ s }}</li>
            </ul>
          </div>
          <div v-if="summary.areas_to_improve?.length" class="summary-block">
            <h4 class="summary-subheading">Areas to Improve</h4>
            <ul class="summary-list">
              <li v-for="(a, i) in summary.areas_to_improve" :key="i">{{ a }}</li>
            </ul>
          </div>
        </div>

        <div class="download-actions">
          <button class="btn-ghost" @click="downloadReport('md')" :disabled="!!downloading">
            <span v-if="downloading === 'md'" class="spinner spinner-sm"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Markdown
          </button>
          <button class="btn-primary" @click="downloadReport('pdf')" :disabled="!!downloading">
            <span v-if="downloading === 'pdf'" class="spinner spinner-sm"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      <div class="done-actions">
        <button class="btn-primary" @click="startPractice" :disabled="loadingQuestions">
          <span v-if="loadingQuestions" class="spinner spinner-sm"></span>
          Practice Again
        </button>
        <button class="btn-ghost" @click="reset">Choose Different Application</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import axios from 'axios';

const applications = ref([]);
const loadingApps = ref(true);
const stage = ref('select'); // select | ready | qna | done
const selectedApp = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answer = ref('');
const feedback = ref(null);
const loadingQuestions = ref(false);
const submitting = ref(false);
const error = ref('');

const voiceLang = ref('en-US');
const speaking = ref(false);
const recording = ref(false);
const availableVoices = ref([]);
const selectedVoiceURI = ref('');

const sessionLog = ref([]);
const summary = ref(null);
const loadingSummary = ref(false);
const summaryError = ref('');
const downloading = ref(null);

const practiceMode = ref('ai'); // 'ai' | 'common'

const cameraEnabled = ref(false);
const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
const faceDetectionSupported = typeof window !== 'undefined' && 'FaceDetector' in window;
const faceDetected = ref(null); // null = unknown/checking, true/false once detection runs
const videoEl = ref(null);
let cameraStream = null;
let faceDetector = null;
let faceCheckTimer = null;

const recordingVideo = ref(false);
const recordingDuration = ref(0);
const recordedVideoUrl = ref(null);
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;

const SpeechRecognitionCtor = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;
const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const recognitionSupported = !!SpeechRecognitionCtor;
let recognition = null;

const voicesForLang = computed(() => {
  const prefix = voiceLang.value.split('-')[0].toLowerCase();
  return availableVoices.value.filter(v => v.lang.toLowerCase().startsWith(prefix));
});

const eligibleApps = computed(() => applications.value.filter(a => a.cv_filename && a.job_description));
const currentQuestion = computed(() => questions.value[currentIndex.value] || '');
const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1);
const progressPct = computed(() =>
  questions.value.length ? Math.round((currentIndex.value / questions.value.length) * 100) : 0
);

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarBg(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue},50%,30%)`;
}

function commonQuestions(app) {
  return [
    'Please introduce yourself.',
    `Why do you want to join ${app.company} as a ${app.role}? What do you know about us?`,
    'What is your reason for wanting to leave your current company?',
    'Is there anything you would like to ask us?',
  ];
}

function selectApp(app) {
  selectedApp.value = app;
  error.value = '';
  stage.value = 'ready';
}

function reset() {
  stopSpeaking();
  stopRecording();
  stopCamera();
  selectedApp.value = null;
  questions.value = [];
  currentIndex.value = 0;
  answer.value = '';
  feedback.value = null;
  error.value = '';
  sessionLog.value = [];
  summary.value = null;
  summaryError.value = '';
  stage.value = 'select';
}

async function startPractice() {
  error.value = '';
  stopSpeaking();
  stopRecording();

  if (practiceMode.value === 'common') {
    questions.value = commonQuestions(selectedApp.value);
    currentIndex.value = 0;
    answer.value = '';
    feedback.value = null;
    sessionLog.value = [];
    summary.value = null;
    summaryError.value = '';
    stage.value = 'qna';
    return;
  }

  loadingQuestions.value = true;
  try {
    const { data } = await axios.post(`/api/applications/${selectedApp.value.id}/interview/questions`);
    questions.value = data.questions;
    currentIndex.value = 0;
    answer.value = '';
    feedback.value = null;
    sessionLog.value = [];
    summary.value = null;
    summaryError.value = '';
    stage.value = 'qna';
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to generate interview questions.';
    stage.value = 'ready';
  } finally {
    loadingQuestions.value = false;
  }
}

async function submitAnswer() {
  submitting.value = true;
  error.value = '';
  try {
    const { data } = await axios.post(`/api/applications/${selectedApp.value.id}/interview/feedback`, {
      question: currentQuestion.value,
      answer: answer.value,
      duration_seconds: recordedVideoUrl.value ? recordingDuration.value : undefined,
    });
    feedback.value = data;
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to get feedback.';
  } finally {
    submitting.value = false;
  }
}

function nextQuestion() {
  stopSpeaking();
  stopRecording();
  discardRecording();
  sessionLog.value.push({
    question: currentQuestion.value,
    answer: answer.value,
    feedback: feedback.value.feedback,
    improved_answer: feedback.value.improved_answer,
  });
  if (isLastQuestion.value) {
    stage.value = 'done';
    loadSummary();
    return;
  }
  currentIndex.value++;
  answer.value = '';
  feedback.value = null;
  error.value = '';
}

async function loadSummary() {
  loadingSummary.value = true;
  summary.value = null;
  summaryError.value = '';
  try {
    const { data } = await axios.post(`/api/applications/${selectedApp.value.id}/interview/summary`, {
      items: sessionLog.value,
    });
    summary.value = data;
  } catch (e) {
    summaryError.value = e.response?.data?.error || 'Failed to generate session summary.';
  } finally {
    loadingSummary.value = false;
  }
}

async function downloadReport(format) {
  downloading.value = format;
  try {
    const response = await axios.post(
      `/api/applications/${selectedApp.value.id}/interview/report`,
      { items: sessionLog.value, summary: summary.value },
      { params: { format }, responseType: 'blob' }
    );
    const blob = new Blob([response.data], {
      type: format === 'pdf' ? 'application/pdf' : 'text/markdown',
    });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="(.+?)"/);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = match ? match[1] : `interview-practice.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    summaryError.value = 'Failed to download report.';
  } finally {
    downloading.value = null;
  }
}

// Browsers expose several voices per language; "Natural"/"Neural"/"Google" voices
// sound far less robotic than the default system voice, so prefer those.
function scoreVoice(voice) {
  const name = voice.name.toLowerCase();
  if (name.includes('natural')) return 100;
  if (name.includes('neural')) return 90;
  if (name.includes('premium')) return 80;
  if (name.includes('enhanced')) return 70;
  if (name.includes('google')) return 50;
  return 0;
}

function pickBestVoice(voices, lang) {
  const prefix = lang.split('-')[0].toLowerCase();
  const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
  if (!candidates.length) return null;
  return candidates.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best), candidates[0]);
}

function voiceLabel(voice) {
  return voice.name.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, ' (Natural)');
}

function autoSelectVoice() {
  const best = pickBestVoice(availableVoices.value, voiceLang.value);
  selectedVoiceURI.value = best ? best.voiceURI : '';
}

function loadVoices() {
  availableVoices.value = window.speechSynthesis.getVoices();
  if (availableVoices.value.length && !selectedVoiceURI.value) {
    autoSelectVoice();
  }
}

watch(voiceLang, () => {
  const current = availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value);
  const prefix = voiceLang.value.split('-')[0].toLowerCase();
  if (!current || !current.lang.toLowerCase().startsWith(prefix)) {
    autoSelectVoice();
  }
});

function speak(text) {
  if (!speechSupported || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = voiceLang.value;
  const voice = availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value);
  if (voice) utter.voice = voice;
  utter.rate = 0.95;
  utter.onend = () => { speaking.value = false; };
  utter.onerror = () => { speaking.value = false; };
  speaking.value = true;
  window.speechSynthesis.speak(utter);
}

function stopSpeaking() {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  speaking.value = false;
}

function toggleRecording() {
  if (!recognitionSupported) return;
  if (recording.value) {
    recognition?.stop();
    return;
  }
  error.value = '';
  recognition = new SpeechRecognitionCtor();
  recognition.lang = voiceLang.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ').trim();
    answer.value = answer.value.trim() ? `${answer.value.trim()} ${transcript}` : transcript;
  };
  recognition.onend = () => { recording.value = false; };
  recognition.onerror = (e) => {
    recording.value = false;
    if (e.error === 'no-speech') {
      error.value = 'No speech detected. Try again and speak clearly into your microphone.';
    } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      error.value = 'Microphone access was denied. Allow microphone permissions for this site and try again.';
    } else if (e.error === 'audio-capture') {
      error.value = 'No microphone was found. Connect a microphone and try again.';
    } else if (e.error === 'network') {
      error.value = 'Speech recognition needs an internet connection. Check your connection and try again.';
    } else {
      error.value = `Speech recognition error: ${e.error}`;
    }
  };
  recording.value = true;
  recognition.start();
}

function stopRecording() {
  if (recording.value) recognition?.stop();
}

async function toggleCamera() {
  if (cameraEnabled.value) {
    stopCamera();
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    error.value = 'Could not access the camera/microphone. Check your browser permissions.';
    return;
  }
  cameraEnabled.value = true;
  await nextTick();
  if (videoEl.value) videoEl.value.srcObject = cameraStream;
  if (faceDetectionSupported) {
    faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    faceCheckTimer = setInterval(checkFace, 1500);
  }
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toggleVideoRecording() {
  if (recordingVideo.value) {
    mediaRecorder?.stop();
    if (recording.value) stopRecording();
    return;
  }
  if (!cameraStream) return;
  discardRecording();
  try {
    mediaRecorder = new MediaRecorder(cameraStream);
  } catch {
    error.value = 'Recording is not supported in this browser.';
    return;
  }
  recordedChunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
    recordedVideoUrl.value = URL.createObjectURL(blob);
    recordingVideo.value = false;
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
  };
  recordingDuration.value = 0;
  recordingVideo.value = true;
  recordingTimer = setInterval(() => { recordingDuration.value++; }, 1000);
  mediaRecorder.start();
  if (recognitionSupported && !recording.value) toggleRecording();
}

function discardRecording() {
  if (recordedVideoUrl.value) {
    URL.revokeObjectURL(recordedVideoUrl.value);
    recordedVideoUrl.value = null;
  }
  recordingDuration.value = 0;
}

async function checkFace() {
  if (!videoEl.value || videoEl.value.readyState < 2 || !faceDetector) return;
  try {
    const faces = await faceDetector.detect(videoEl.value);
    faceDetected.value = faces.length > 0;
  } catch {
    faceDetected.value = null;
  }
}

function stopCamera() {
  if (recordingVideo.value) mediaRecorder?.stop();
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  discardRecording();
  recordingVideo.value = false;
  if (faceCheckTimer) {
    clearInterval(faceCheckTimer);
    faceCheckTimer = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  faceDetector = null;
  faceDetected.value = null;
  cameraEnabled.value = false;
}

onMounted(async () => {
  if (speechSupported) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  try {
    const { data } = await axios.get('/api/applications');
    applications.value = data;
  } catch (e) {
    error.value = 'Failed to load applications.';
  } finally {
    loadingApps.value = false;
  }
});

onBeforeUnmount(() => {
  stopSpeaking();
  stopRecording();
  stopCamera();
  if (speechSupported) window.speechSynthesis.onvoiceschanged = null;
});
</script>

<style scoped>
.spinner-sm { width: 14px; height: 14px; border-width: 2px; }

.empty-icon { color: var(--muted); margin-bottom: 4px; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--text); }
.empty-sub { font-size: 13px; max-width: 380px; }
.done-icon { color: var(--success); }
.done-actions { display: flex; gap: 8px; margin-top: 8px; }

/* App list (selection) */
.app-list { display: flex; flex-direction: column; gap: 8px; }

.app-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.app-row:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary-subtle);
}

.app-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.app-info { flex: 1; min-width: 0; }
.company-name { font-weight: 600; font-size: 14px; }
.role-name { font-size: 12px; color: var(--text-2); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.chevron { color: var(--muted); flex-shrink: 0; }

/* Ready screen */
.prep-ready { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.back-btn { align-self: flex-start; }

.prep-ready-app { display: flex; align-items: center; gap: 14px; }

.prep-ready-desc { font-size: 13px; color: var(--text-2); line-height: 1.6; }

/* Mode picker */
.mode-picker { display: flex; gap: 12px; width: 100%; }
.mode-card {
  flex: 1;
  text-align: left;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
  color: var(--text);
}
.mode-card:hover { border-color: var(--primary); }
.mode-card.active { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary-subtle); background: var(--primary-subtle); }
.mode-card strong { font-size: 13px; }
.mode-card span { font-size: 12px; color: var(--text-2); line-height: 1.5; }

/* Q&A */
.qna-wrap { display: flex; flex-direction: column; gap: 16px; }

.qna-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.qna-progress-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

.progress-track {
  height: 6px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Question + camera side-by-side */
.qna-main-row { display: flex; gap: 16px; align-items: stretch; }
.qna-main-row .qna-question-card { flex: 1; min-width: 0; }
.qna-main-row .camera-card { flex: 0 0 320px; }

/* Camera check */
.camera-card { display: flex; flex-direction: column; gap: 10px; }
.camera-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.camera-body { display: flex; flex-direction: column; gap: 8px; }
.camera-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  background: #000;
  object-fit: cover;
}
.camera-live { transform: scaleX(-1); }
.camera-record-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.camera-note { margin-top: auto; }
.face-status {
  display: inline-block;
  font-size: 12px; font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  width: fit-content;
}
.face-status.face-ok { color: var(--success); background: rgba(34, 197, 94, 0.1); }
.face-status.face-warn { color: var(--danger); background: var(--danger-bg); }

.qna-question-card { display: flex; flex-direction: column; gap: 10px; }
.qna-question-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.qna-tag {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--primary);
}
.qna-question-text { font-size: 16px; font-weight: 500; line-height: 1.5; color: var(--text); }

.qna-answer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.qna-voice-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.lang-select { width: auto; padding: 6px 10px; font-size: 12px; }
.voice-select { max-width: 220px; }

.btn-recording {
  color: var(--danger);
  border-color: rgba(248,113,113,0.4);
  background: var(--danger-bg);
}

.qna-error { margin-top: 12px; margin-bottom: 0; }
.qna-actions { margin-top: 14px; }

.feedback-card { display: flex; flex-direction: column; gap: 16px; }
.feedback-block { display: flex; flex-direction: column; gap: 6px; }
.feedback-heading {
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--primary);
}
.feedback-text { font-size: 13px; color: var(--text-2); line-height: 1.6; white-space: pre-line; }
.improved-answer {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text);
}

/* Session summary */
.summary-card { display: flex; flex-direction: column; gap: 16px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.summary-block { display: flex; flex-direction: column; gap: 6px; }
.summary-subheading { font-size: 13px; font-weight: 600; color: var(--text); }
.summary-list { padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.summary-list li { font-size: 13px; color: var(--text-2); line-height: 1.6; }

.download-actions {
  display: flex; gap: 8px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

@media (max-width: 768px) {
  .mode-picker { flex-direction: column; }
  .qna-main-row { flex-direction: column; }
  .qna-main-row .camera-card { flex: 1; width: 100%; }
  .qna-top { flex-direction: column; align-items: flex-start; gap: 8px; }
  .qna-question-head { flex-wrap: wrap; gap: 8px; }
  .qna-answer-head { flex-direction: column; align-items: flex-start; }
  .qna-voice-controls { width: 100%; }
  .lang-select { flex: 1; }
  .voice-select { max-width: none; flex-basis: 100%; }
  .done-actions, .download-actions { flex-direction: column; width: 100%; }
  .done-actions .btn-primary, .done-actions .btn-ghost,
  .download-actions .btn-primary, .download-actions .btn-ghost { justify-content: center; }
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
