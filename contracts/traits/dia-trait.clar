;; dia-trait
;; Matches DIA's on-chain oracle interface (get-value), verified against the
;; deployed contract's ABI. Real DIA conforms structurally, so the deployed
;; DIA principal (testnet ST1S5..., mainnet SP1G48...) can be passed as this
;; trait at call time - and a mock-dia can stand in for offline tests.
;; All DIA feeds use an implicit 8-decimal fixed point.
(define-trait dia-trait
  (
    (get-value ((string-ascii 32)) (response { timestamp: uint, value: uint } uint))
  )
)
