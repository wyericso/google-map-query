const backendUri = 'https://mockapi.glitch.me/route';
const mockableUri = 'https://demo4582511.mockable.io/';
const googleMapApiKey = 'AIzaSyA4pEJNZ5sYarZVw8TeWpruX48VjPbPyO0';
const googleGeoCodeApiUri = 'https://maps.googleapis.com/maps/api/geocode/json';
const maxDropoff = 24; //should be 24, due to limitation of Google Map API.
var map;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 22.378949, lng: 114.126701},
    zoom: 11
  });
}

function calculateAndDisplayRoute(routeLatLngArr) {
  var directionsService = new google.maps.DirectionsService;
  var directionsDisplay = new google.maps.DirectionsRenderer;
  directionsDisplay.setMap(map);
  var routeLatLngObjArr = routeLatLngArr.map(function(elem) {
    return new google.maps.LatLng({lat: parseFloat(elem[0]), lng: parseFloat(elem[1])});
  });
  
  directionsService.route({
    origin: routeLatLngObjArr.shift(),
    destination: routeLatLngObjArr.pop(),
    waypoints: routeLatLngObjArr.map(function(elem) {
      return {location: elem, stopover: true};
    }),
    travelMode: 'DRIVING'
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
      resetSubmitBtn();
    }
  });
}

function resetSubmitBtn() {
  $('#submit').removeClass('active').html('').text('Submit');
}

$(document).ready(function() {
  // show max. dropoff addresses value.
  $('#maxdropoff').text(maxDropoff);

  // adding more addresses.
  $('#add').click(function() {
    if ($('input[name="dropoff"]').length < maxDropoff + 1) {
      $('.copy').before($('.copy').html());
      $('input:nth-last-child(2)').focus();
    }
    else {
      alert('Cannot exceed ' + maxDropoff + ' dropoff addresses.');
    }
  });
  
  // removing address.
  $('body').on("click", "#remove", function() {
    $(this).parents('.input-group').remove();
  });
  
  // submit form.
  $('#addressform').submit(function(event) {
    // if form is valid.
    if (document.getElementById('addressform').checkValidity()) {
      // submit button -> loading.
      $('#submit').addClass('active').text('').html('<i class="fa fa-spinner fa-spin"></i>');

      // put all address inputs in addressArr.
      var addressArr = $('#addressform').serializeArray().map(function(elem) {
        return elem.value;
      })
      .filter(function(elem2) {
        return elem2 !== ''
      });

      // request Google to return lnglat value of all addresses in addressArr.
      var latLngArr = [];
      var jqXhrArr = addressArr.map(function(elem, index) {
        return $.get(googleGeoCodeApiUri,
                     {address: elem, key: googleMapApiKey},
                     function(data) {
          latLngArr[index] = [data.results[0].geometry.location.lat,
                              data.results[0].geometry.location.lng];
        });
      });

      // after get all lnglat values from Google, send them to backend.
      $.when(...jqXhrArr).done(function() {
        console.log(latLngArr);
        // send to backend and get a token.
        $.post(backendUri, JSON.stringify(latLngArr), function(data2) {
          if (data2.token) {
            // send token to backend and get returning latlng values.
            $.get(backendUri + '/' + data2.token, function(data3) {
              if (data3.path) {
                calculateAndDisplayRoute(data3.path);
              }
              else if (data3.status == 'in progress') {
                alert('Route calculation in progress, please close this window to retry.');
                $.ajax(this);
              }
              else {
                alert(data3.error);
                resetSubmitBtn();
              }
            })
            .fail(function() {
              alert('Failed to get shortest route. Please retry later.');
              resetSubmitBtn();
            });          
          }
          else {
            alert('Error: ' + data2.error);
            resetSubmitBtn();
          }
        }, 'json')
        .fail(function() {
          alert('Failed to get token. Please retry later.');
          resetSubmitBtn();
        });
      });
    }
    // else, the form is invalid.
    else {
      $('#addressform').addClass('was-validated');
    }
    event.preventDefault();
  });
});