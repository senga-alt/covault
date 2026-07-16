;; mock-dia (test double for DIA)
;; Same get-value shape as DIA. Used to unit-test the DIA settlement path
;; deterministically and offline. Production passes the real DIA principal.
;; set-value quotes read as fresh (timestamp = current Stacks block time);
;; set-value-at pins an explicit timestamp so staleness can be tested.
(define-constant ERR-NOT-OWNER (err u400))

(define-data-var contract-owner principal tx-sender)
(define-map feed (string-ascii 32) { value: uint, ts: (optional uint) })

;; #[allow(unchecked_data)]
(define-public (set-value (key (string-ascii 32)) (value uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (ok (map-set feed key { value: value, ts: none }))))

;; #[allow(unchecked_data)]
(define-public (set-value-at (key (string-ascii 32)) (value uint) (ts uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (ok (map-set feed key { value: value, ts: (some ts) }))))

(define-read-only (get-value (key (string-ascii 32)))
  (let ((entry (default-to { value: u0, ts: none } (map-get? feed key))))
    (ok { timestamp: (default-to stacks-block-time (get ts entry)), value: (get value entry) })))
