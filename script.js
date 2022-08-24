'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; //km
        this.duration = duration; //min
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(
            1
        )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this._calcPace();
        this._setDescription();
    }

    _calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        //min/km
        this.speed = this.distance / this.duration;
        return this.speed;
    }
}

class App {
    #map;
    #zoom = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();

        this._getLocalStorage();

        //  -----------Listener form submit
        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleElevationField);

        containerWorkouts.addEventListener(
            'click',
            this._moveToPopup.bind(this)
        );
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Could not get the position');
                }
            );
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;

        // console.log(
        //     `https://www.google.com.ua/maps/@${latitude},${longitude},12.7z?hl=ru`
        // );
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);
        // -----------Listener click
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value =
            inputDuration.value =
            inputCadence.value =
            inputElevation.value =
                '';
        form.style.display = 'none';
        form.classList.add('hidden');

        setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    _toggleElevationField() {
        inputElevation
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
        inputCadence
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        //get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        //check if valid
        const validInputs = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const positiveInputs = (...inputs) => inputs.every(input => input > 0);

        //if worcout is running create running obj
        if (type === 'running') {
            const cadence = +inputCadence.value;

            if (
                !validInputs(distance, duration, cadence) ||
                !positiveInputs(distance, duration, cadence)
            )
                return alert('Input has to be positive numbers');

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // if worcout is cycling create cycling obj
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            if (
                !validInputs(distance, duration, elevation) ||
                !positiveInputs(distance, duration)
            )
                return alert('Input has to be positive numbers');
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        // add new object to workouts array
        this.#workouts.push(workout);

        //render workout on map as marker
        this._hideForm();
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);

        //set local Storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workoutObj) {
        L.marker(workoutObj.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    minWidth: 100,
                    maxWidth: 250,
                    autoClose: false,
                    className: `${workoutObj.type}-popup`,
                })
            )
            .setPopupContent(
                `${workoutObj.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'} ${
                    workoutObj.description
                }`
            )
            .openPopup();
    }

    _renderWorkout(workoutObj) {
        let html = ` 
        <li class="workout workout--${workoutObj.type}" data-id="${
            workoutObj.id
        }">
           <h2 class="workout__title">${workoutObj.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
              workoutObj.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'
          }</span>
          <span class="workout__value">${workoutObj.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workoutObj.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if (workoutObj.type === 'running') {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workoutObj.pace.toFixed(
                    1
                )}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workoutObj.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            </li>`;
        }

        if (workoutObj.type === 'sycling') {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workoutObj.speed}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workoutObj.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(
            item => item.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.coords, this.#zoom, {
            animate: true,
            pan: { duration: 1 },
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();
