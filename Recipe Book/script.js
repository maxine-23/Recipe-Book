// --- Utility & initial state ---
const $ = window.jQuery;
const FAVORITES_KEY = 'bougie_favorites_v1';
let favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
let currentSteps = [];
let currentIndex = 0;
let currentRecipeName = '';
let currentImageUrl = '';

// --- DOM refs ---
const $cards = $('#cards');
const $search = $('#searchInput');
const $category = $('#categoryFilter');
const $randomBtn = $('#randomBtn');
const $darkToggle = $('#darkToggle');
const $darkIcon = $('#darkIcon');
const $recipeModal = new bootstrap.Modal($('#recipeModal')[0], { keyboard:true });
const $modalTitle = $('#modalTitle');
const $modalIngredients = $('#modalIngredients');
const $stepText = $('#stepText');
const $stepCounter = $('#stepCounter');
const $prevStep = $('#prevStep');
const $nextStep = $('#nextStep');
const $openAll = $('#openAll');
const $modalImage = $('#modalImage');
const $modalFav = $('#modalFav');

// --- Initialize favorites UI on page load ---
function initFavoritesUI(){
  $('.recipe-card').each(function(){
    const name = $(this).data('name');
    const $btn = $(this).find('.fav-btn');
    if(favorites.has(name)) { $btn.addClass('active'); $btn.find('i').removeClass('bi-star').addClass('bi-star-fill'); }
    else { $btn.removeClass('active'); $btn.find('i').addClass('bi-star').removeClass('bi-star-fill'); }
  });
}
initFavoritesUI();

// --- Favorite toggling ---
$cards.on('click', '.fav-btn', function(e){
  e.preventDefault(); e.stopPropagation();
  const $card = $(this).closest('.recipe-card');
  const name = $card.data('name');
  if(favorites.has(name)){ favorites.delete(name); $(this).removeClass('active').find('i').removeClass('bi-star-fill').addClass('bi-star'); }
  else { favorites.add(name); $(this).addClass('active').find('i').removeClass('bi-star').addClass('bi-star-fill'); }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
});

// --- Open modal from card view button ---
$cards.on('click', '.view-btn', function(){
  const $btn = $(this);
  const title = $btn.data('title');
  const steps = JSON.parse(JSON.stringify($btn.data('steps'))); // sometimes jQuery returns string; ensure array
  const ingredientsString = $btn.attr('data-ingredients') || $btn.data('ingredients') || '';
  const ingredientsArr = String(ingredientsString).split(',').map(s=>s.trim()).filter(Boolean);

  // handle steps if it's a string (some data attributes are strings)
  let stepsArr;
  if (typeof steps === 'string') {
    try { stepsArr = JSON.parse(steps); }
    catch { stepsArr = steps.split('|').map(s=>s.trim()).filter(Boolean); }
  } else {
    stepsArr = steps;
  }

  // if image exists, derive from parent card img
  const imgUrl = $(this).closest('.card').find('.card-img-top').attr('src') || '';

  openRecipeModal(title, ingredientsArr, stepsArr, imgUrl);
});

// --- Random recipe ---
$randomBtn.on('click', function(){
  const visible = $('.recipe-card:visible');
  if(!visible.length) { return alert('No recipes visible to choose from.'); }
  const rand = visible.eq(Math.floor(Math.random() * visible.length));
  rand.find('.view-btn').trigger('click');
});

// --- Modal open / populate ---
function openRecipeModal(title, ingredients, steps, image){
  currentSteps = steps || [];
  currentIndex = 0;
  currentRecipeName = title;
  currentImageUrl = image || '';

  $modalTitle.text(title);
  // ingredients
  $modalIngredients.empty();
  ingredients.forEach(ing => { $modalIngredients.append(`<li>• ${ing}</li>`); });

  // show step 0
  showStep(currentIndex);

  // set modal image background
  if(currentImageUrl){
    $modalImage.css('background-image', `url('${currentImageUrl}')`);
  } else {
    $modalImage.css('background-image','none');
  }

  // set modal favorite button
  updateModalFav();

  $recipeModal.show();
}

// --- Step navigation ---
function showStep(i){
  if(!currentSteps || currentSteps.length === 0){
    $stepCounter.text('No step-by-step instructions available.');
    $stepText.text('');
    $prevStep.prop('disabled', true);
    $nextStep.prop('disabled', true);
    return;
  }
  // clamp
  currentIndex = Math.max(0, Math.min(i, currentSteps.length - 1));
  $stepCounter.text(`Step ${currentIndex + 1} of ${currentSteps.length}`);
  $stepText.text(currentSteps[currentIndex]);
  $prevStep.prop('disabled', currentIndex === 0);
  $nextStep.prop('disabled', currentIndex === currentSteps.length - 1);
}

$prevStep.on('click', ()=> showStep(currentIndex - 1));
$nextStep.on('click', ()=> showStep(currentIndex + 1));

// show all steps in a quick alert-ish slide (simple)
$openAll.on('click', function(){
  if(!currentSteps || currentSteps.length === 0) return;
  const all = currentSteps.map((s,i)=> `${i+1}. ${s}`).join('\n\n');
  // open a new small window-like modal? Simpler: replace step area with all steps temporarily
  $stepCounter.text('All Steps');
  $stepText.html(all.replace(/\n/g, '<br>'));
  $prevStep.prop('disabled', true); $nextStep.prop('disabled', true);
});

// modal favorite toggle
$modalFav.on('click', function(){
  if(!currentRecipeName) return;
  if(favorites.has(currentRecipeName)) favorites.delete(currentRecipeName);
  else favorites.add(currentRecipeName);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  initFavoritesUI();
  updateModalFav();
});

function updateModalFav(){
  if(favorites.has(currentRecipeName)) { $modalFav.addClass('active btn-warning').removeClass('btn-outline-warning').html('<i class="bi bi-star-fill"></i>'); }
  else { $modalFav.removeClass('active btn-warning').addClass('btn-outline-warning').html('<i class="bi bi-star"></i>'); }
}

// when modal closes, reset to currentIndex view
$('#recipeModal').on('hidden.bs.modal', function(){
  showStep(0);
});

// --- Search & Filters (search in name + ingredients attributes) ---
function applyFilters(){
  const q = $search.val().trim().toLowerCase();
  const cat = $category.val();
  $('.recipe-card').each(function(){
    const name = ($(this).data('name') || '').toString().toLowerCase();
    const ingr = ($(this).attr('data-ingredients') || $(this).data('ingredients') || '').toString().toLowerCase();
    const catMatch = !cat || $(this).data('category') === cat;
    const textMatch = !q || name.includes(q) || ingr.includes(q);
    if(catMatch && textMatch) $(this).show();
    else $(this).hide();
  });
}
$search.on('input', applyFilters);
$category.on('change', applyFilters);

// --- Dark mode toggle with persistence ---
const THEME_KEY = 'bougie_theme_v1';
function setTheme(theme){
  if(theme === 'dark'){ $('body').addClass('dark').removeClass('light'); $darkIcon.removeClass('bi-moon-fill').addClass('bi-sun-fill'); }
  else { $('body').addClass('light').removeClass('dark'); $darkIcon.removeClass('bi-sun-fill').addClass('bi-moon-fill'); }
  localStorage.setItem(THEME_KEY, theme);
}
$darkToggle.on('click', function(){
  const isDark = $('body').hasClass('dark');
  setTheme(isDark ? 'light' : 'dark');
});
// init theme
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
setTheme(savedTheme);

// --- keyboard navigation for modal: left/right -->
$(document).on('keydown', function(e){
  // left arrow
  if($('#recipeModal').hasClass('show')){
    if(e.key === 'ArrowLeft') $prevStep.trigger('click');
    if(e.key === 'ArrowRight') $nextStep.trigger('click');
  }
});

// small UX: clicking a card (not the buttons) opens the modal
$cards.on('click', '.card', function(e){
  // ignore clicks on buttons
  if($(e.target).closest('button, .view-btn, .fav-btn').length) return;
  $(this).find('.view-btn').trigger('click');
});

// initial small animation / reveal
$('.recipe-card').css({opacity:0, transform:'translateY(10px)'}).each(function(i){
  $(this).delay(i*60).animate({opacity:1, transform:'translateY(0)'}, {duration:450, step: function(now, fx){
    $(this).css('transform', `translateY(${ (1-now) * 8 }px)`);
  }});
});

// ensure UI reflects favorites if user toggles in another tab
window.addEventListener('storage', () => {
  favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  initFavoritesUI();
});
